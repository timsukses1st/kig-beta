-- ============================================================
-- ALPHA — MIGRATION V8 (versi aman, boleh di-Run ulang)
-- Project (klien) sebagai lapisan di atas Akun media.
-- PRASYARAT: v7a & v7b sudah dijalankan (tabel content_requests ada).
-- ============================================================

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.accounts
  add column if not exists project_id uuid references public.projects (id) on delete set null;

alter table public.contents
  add column if not exists project_id uuid references public.projects (id) on delete set null;

alter table public.content_requests
  add column if not exists project_id uuid references public.projects (id) on delete set null;

create index if not exists contents_project_idx on public.contents (project_id);

alter table public.projects enable row level security;

drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select to authenticated using (public.my_role() is not null);

drop policy if exists projects_write on public.projects;
create policy projects_write on public.projects
  for all to authenticated
  using (public.is_privileged())
  with check (public.is_privileged());

grant select, insert, update, delete on public.projects to authenticated;

-- Project awal + tautkan akun & konten lama
insert into public.projects (name, label)
select 'KIG Media Film', 'Internal · Film'
where not exists (select 1 from public.projects where name = 'KIG Media Film');

update public.accounts
set project_id = (select id from public.projects where name = 'KIG Media Film')
where project_id is null;

update public.contents
set project_id = (select id from public.projects where name = 'KIG Media Film')
where project_id is null;

-- Cek cepat: select * from projects;
