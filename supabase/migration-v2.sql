-- ============================================================
-- BETA — Content Launch System
-- MIGRATION V2 (upgrade dari v1 → skema blueprint)
-- Jalankan SEKALI di Supabase SQL Editor project kig-beta.
-- CATATAN: tabel konten & log v1 DI-RESET (data tes hilang).
--          profiles & akun login TIDAK disentuh — role kamu aman.
-- ============================================================

-- 1. BERSIHKAN LAPISAN KONTEN V1 --------------------------------
drop table if exists public.contents cascade;
drop table if exists public.activity_log cascade;
drop function if exists public.log_content_change() cascade;
drop function if exists public.team_can_edit(content_status) cascade;
drop function if exists public.team_can_target(content_status) cascade;
drop type if exists public.content_status cascade;

-- 2. ENUM BARU ---------------------------------------------------
create type content_status as enum
  ('ide', 'drafting', 'review', 'siap_upload', 'terjadwal', 'published', 'diiklankan');
create type content_pillar as enum
  ('lagi_ramai', 'wajib_tonton', 'di_balik_layar', 'panas_timeline');

-- 3. ACCOUNTS (tabel, bukan enum — nambah akun tanpa migrasi) ----
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.accounts (handle, label) values
  ('@cinemasocietyy', 'Media film'),
  ('@mediaruangfilm', 'Media film');

-- 4. CONTENTS V2 (tabel induk pipeline) --------------------------
create table public.contents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  account_id uuid references public.accounts (id),
  pillar content_pillar not null default 'lagi_ramai',
  status content_status not null default 'ide',
  pic_creative uuid references public.profiles (id),
  pic_distribution uuid references public.profiles (id),
  pic_ads uuid references public.profiles (id),
  deadline date,
  publish_date date,
  caption text,
  asset_url text,
  visual_hook text,
  production_note text,
  potensi_fyp boolean not null default false,
  priority int2,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contents_touch
before update on public.contents
for each row execute function public.touch_updated_at();

-- 5. HELPER WEWENANG TIM (versi 7 status) ------------------------
create or replace function public.team_can_edit(s content_status)
returns boolean language sql stable as $$
  select case public.my_team()
    when 'delta' then true
    when 'creative' then s in ('ide', 'drafting', 'review')
    when 'distribution' then s in ('siap_upload', 'terjadwal')
    when 'ads' then s in ('published', 'diiklankan')
    else false
  end;
$$;

create or replace function public.team_can_target(s content_status)
returns boolean language sql stable as $$
  select case public.my_team()
    when 'delta' then true
    when 'creative' then s in ('ide', 'drafting', 'review', 'siap_upload')
    when 'distribution' then s in ('siap_upload', 'terjadwal', 'published')
    when 'ads' then s in ('published', 'diiklankan')
    else false
  end;
$$;

-- 6. ACTIVITY LOGS V2 --------------------------------------------
create table public.activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  actor_name text,
  action text not null,           -- membuat / mengubah / memindahkan / menghapus / role_change
  entity text not null default 'konten',
  entity_title text,
  detail text,
  created_at timestamptz not null default now()
);

create or replace function public.log_content_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_email text; v_name text;
begin
  select email, full_name into v_email, v_name from public.profiles where id = auth.uid();

  if tg_op = 'INSERT' then
    insert into public.activity_logs (actor_id, actor_email, actor_name, action, entity_title, detail)
    values (auth.uid(), v_email, v_name, 'membuat', new.title, 'Status awal: ' || new.status);
    return new;
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.activity_logs (actor_id, actor_email, actor_name, action, entity_title, detail)
      values (auth.uid(), v_email, v_name, 'memindahkan', new.title, old.status || ' → ' || new.status);
    else
      insert into public.activity_logs (actor_id, actor_email, actor_name, action, entity_title, detail)
      values (auth.uid(), v_email, v_name, 'mengubah', new.title, 'Detail konten diperbarui');
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.activity_logs (actor_id, actor_email, actor_name, action, entity_title, detail)
    values (auth.uid(), v_email, v_name, 'menghapus', old.title, 'Status terakhir: ' || old.status);
    return old;
  end if;
  return null;
end;
$$;

create trigger contents_log
after insert or update or delete on public.contents
for each row execute function public.log_content_change();

-- log perubahan role/team/status user (aksi Kelola Akses)
create or replace function public.log_profile_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_email text; v_name text;
begin
  if new.role is distinct from old.role
     or new.team is distinct from old.team
     or new.is_active is distinct from old.is_active then
    select email, full_name into v_email, v_name from public.profiles where id = auth.uid();
    insert into public.activity_logs (actor_id, actor_email, actor_name, action, entity, entity_title, detail)
    values (
      auth.uid(), v_email, v_name, 'role_change', 'user',
      coalesce(new.full_name, new.email),
      concat_ws(' · ',
        case when new.role is distinct from old.role then old.role || ' → ' || new.role end,
        case when new.team is distinct from old.team then coalesce(old.team::text,'—') || ' → ' || coalesce(new.team::text,'—') end,
        case when new.is_active is distinct from old.is_active then case when new.is_active then 'diaktifkan' else 'dinonaktifkan' end end
      )
    );
  end if;
  return new;
end;
$$;

create trigger profiles_log
after update on public.profiles
for each row execute function public.log_profile_change();

-- 7. RLS ----------------------------------------------------------
alter table public.accounts enable row level security;
alter table public.contents enable row level security;
alter table public.activity_logs enable row level security;

create policy accounts_select on public.accounts
  for select to authenticated using (public.my_role() is not null);
create policy accounts_write on public.accounts
  for all to authenticated
  using (public.my_role() = 'superadmin')
  with check (public.my_role() = 'superadmin');

create policy contents_select on public.contents
  for select to authenticated using (public.my_role() is not null);

create policy contents_insert on public.contents
  for insert to authenticated
  with check (
    public.is_privileged()
    or (public.my_role() = 'tim' and public.my_team() in ('creative', 'delta') and public.team_can_target(status))
  );

create policy contents_update on public.contents
  for update to authenticated
  using (public.is_privileged() or (public.my_role() = 'tim' and public.team_can_edit(status)))
  with check (public.is_privileged() or (public.my_role() = 'tim' and public.team_can_target(status)));

create policy contents_delete on public.contents
  for delete to authenticated using (public.is_privileged());

-- Log hanya bisa dibaca superadmin & manager (sesuai blueprint §6)
create policy logs_select on public.activity_logs
  for select to authenticated using (public.is_privileged());

-- 8. GRANTS -------------------------------------------------------
grant select, insert, update, delete on public.contents to authenticated;
grant select, insert, update, delete on public.accounts to authenticated;
grant select on public.activity_logs to authenticated;

-- ============================================================
-- SELESAI. Cek cepat setelah run:
--   select * from accounts;            -- harus 2 baris
--   select * from profiles;            -- role kamu masih superadmin
-- ============================================================
