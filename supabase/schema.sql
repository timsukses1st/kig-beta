-- ============================================================
-- BETA — Content Launch System
-- Migration v1 (MVP) — jalankan sekali di Supabase SQL Editor
-- ============================================================

-- 1. ENUM ------------------------------------------------------
create type app_role as enum ('superadmin', 'manager', 'tim');
create type app_team as enum ('delta', 'creative', 'distribution', 'ads');
create type content_status as enum ('ide', 'drafting', 'review', 'siap_upload', 'terjadwal', 'published');

-- 2. PROFILES --------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role app_role not null default 'tim',
  team app_team,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto-buat profil saat user baru ditambahkan di Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 3. HELPER (security definer, hindari rekursi RLS) -----------
create or replace function public.my_role()
returns app_role
language sql security definer stable set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

create or replace function public.my_team()
returns app_team
language sql security definer stable set search_path = public
as $$
  select team from public.profiles where id = auth.uid() and is_active;
$$;

create or replace function public.is_privileged()
returns boolean
language sql security definer stable set search_path = public
as $$
  select coalesce(public.my_role() in ('superadmin', 'manager'), false);
$$;

-- Status yang boleh DI-EDIT tim (baris sedang di tahap ini)
create or replace function public.team_can_edit(s content_status)
returns boolean
language sql stable
as $$
  select case public.my_team()
    when 'delta' then true
    when 'creative' then s in ('ide', 'drafting', 'review')
    when 'distribution' then s in ('siap_upload', 'terjadwal')
    when 'ads' then s in ('published')
    else false
  end;
$$;

-- Status TUJUAN yang boleh dipilih tim (termasuk handoff tahap berikutnya)
create or replace function public.team_can_target(s content_status)
returns boolean
language sql stable
as $$
  select case public.my_team()
    when 'delta' then true
    when 'creative' then s in ('ide', 'drafting', 'review', 'siap_upload')
    when 'distribution' then s in ('siap_upload', 'terjadwal', 'published')
    when 'ads' then s in ('published')
    else false
  end;
$$;

-- 4. CONTENTS --------------------------------------------------
create table public.contents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  account text not null default '@cinemasocietyy',
  pillar text not null default 'Lagi Ramai',
  format text not null default 'Reels',
  status content_status not null default 'ide',
  pic text,
  scheduled_at timestamptz,
  published_url text,
  notes text,
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

-- 5. ACTIVITY LOG ----------------------------------------------
create table public.activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  action text not null,          -- membuat / mengubah / memindahkan / menghapus
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
  v_email text;
begin
  select email into v_email from public.profiles where id = auth.uid();

  if tg_op = 'INSERT' then
    insert into public.activity_log (actor_id, actor_email, action, entity_title, detail)
    values (auth.uid(), v_email, 'membuat', new.title, 'Status awal: ' || new.status);
    return new;
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.activity_log (actor_id, actor_email, action, entity_title, detail)
      values (auth.uid(), v_email, 'memindahkan', new.title, old.status || ' → ' || new.status);
    else
      insert into public.activity_log (actor_id, actor_email, action, entity_title, detail)
      values (auth.uid(), v_email, 'mengubah', new.title, 'Detail konten diperbarui');
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.activity_log (actor_id, actor_email, action, entity_title, detail)
    values (auth.uid(), v_email, 'menghapus', old.title, 'Status terakhir: ' || old.status);
    return old;
  end if;
  return null;
end;
$$;

create trigger contents_log
after insert or update or delete on public.contents
for each row execute function public.log_content_change();

-- 6. RLS -------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.contents enable row level security;
alter table public.activity_log enable row level security;

-- PROFILES: semua user aktif bisa lihat; hanya superadmin yang bisa ubah
create policy profiles_select on public.profiles
  for select to authenticated
  using (public.my_role() is not null);

create policy profiles_update on public.profiles
  for update to authenticated
  using (public.my_role() = 'superadmin')
  with check (public.my_role() = 'superadmin');

-- CONTENTS
create policy contents_select on public.contents
  for select to authenticated
  using (public.my_role() is not null);

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
  for delete to authenticated
  using (public.is_privileged());

-- ACTIVITY LOG: semua user aktif bisa baca; tulis hanya via trigger (security definer)
create policy log_select on public.activity_log
  for select to authenticated
  using (public.my_role() is not null);

-- 7. GRANTS (pelajaran dari kasus SIGMA "permission denied") ---
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.contents to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.activity_log to authenticated;

-- ============================================================
-- SETELAH MIGRATION:
-- 1) Authentication → Add user → buat akun kamu.
-- 2) Jadikan superadmin (ganti email di bawah):
--    update public.profiles set role = 'superadmin', team = 'delta'
--    where email = 'EMAIL_KAMU_DISINI';
-- ============================================================
