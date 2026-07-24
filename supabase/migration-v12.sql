-- ============================================================
-- ALPHA — MIGRATION V12
-- Modul Komplain: laporan kendala + thread balasan + statistik.
-- PRASYARAT: v11 sudah dijalankan.
-- ============================================================

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'lainnya',   -- bug / fitur / akses / data / proses / lainnya
  title text not null,
  detail text,
  status text not null default 'baru',        -- baru / diproses / selesai
  reporter_id uuid references public.profiles (id),
  reporter_name text,
  handler_name text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.complaint_messages (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete cascade,
  author_id uuid references public.profiles (id),
  author_name text,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists complaint_msg_idx on public.complaint_messages (complaint_id);

alter table public.complaints enable row level security;
alter table public.complaint_messages enable row level security;

-- Pelapor melihat komplainnya sendiri; lead/superadmin melihat semua
drop policy if exists complaints_select on public.complaints;
create policy complaints_select on public.complaints
  for select to authenticated
  using (public.is_privileged() or reporter_id = auth.uid());

drop policy if exists complaints_insert on public.complaints;
create policy complaints_insert on public.complaints
  for insert to authenticated
  with check (public.my_role() is not null and reporter_id = auth.uid());

-- Ubah status: lead/superadmin (pelapor boleh menyunting miliknya sendiri)
drop policy if exists complaints_update on public.complaints;
create policy complaints_update on public.complaints
  for update to authenticated
  using (public.is_privileged() or reporter_id = auth.uid())
  with check (public.is_privileged() or reporter_id = auth.uid());

drop policy if exists complaints_delete on public.complaints;
create policy complaints_delete on public.complaints
  for delete to authenticated using (public.is_privileged());

-- Pesan: mengikuti visibilitas komplain induknya
drop policy if exists cmsg_select on public.complaint_messages;
create policy cmsg_select on public.complaint_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.complaints c
      where c.id = complaint_id
        and (public.is_privileged() or c.reporter_id = auth.uid())
    )
  );

drop policy if exists cmsg_insert on public.complaint_messages;
create policy cmsg_insert on public.complaint_messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.complaints c
      where c.id = complaint_id
        and (public.is_privileged() or c.reporter_id = auth.uid())
    )
  );

grant select, insert, update, delete on public.complaints to authenticated;
grant select, insert on public.complaint_messages to authenticated;

-- Catat komplain baru & perubahan status ke log aktivitas
create or replace function public.log_complaint_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_email text; v_name text;
begin
  select email, full_name into v_email, v_name from public.profiles where id = auth.uid();
  if tg_op = 'INSERT' then
    insert into public.activity_logs (actor_id, actor_email, actor_name, action, entity, entity_title, detail)
    values (auth.uid(), v_email, v_name, 'membuat', 'komplain', new.title, 'Kategori: ' || new.category);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.activity_logs (actor_id, actor_email, actor_name, action, entity, entity_title, detail)
    values (auth.uid(), v_email, v_name, 'mengubah', 'komplain', new.title, old.status || ' → ' || new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists complaints_log on public.complaints;
create trigger complaints_log
after insert or update on public.complaints
for each row execute function public.log_complaint_change();

-- Cek cepat: select * from complaints;
