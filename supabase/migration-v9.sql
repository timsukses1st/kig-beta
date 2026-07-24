-- ============================================================
-- ALPHA — MIGRATION V9
-- Pemisahan VERTICAL: KC (Kahfi Corp) vs GME (Gala Mega Enigma).
-- Orang KC tidak bisa melihat project GME, dan sebaliknya.
-- Superadmin (Delta) tetap melihat semua.
-- PRASYARAT: v8 sudah dijalankan (tabel projects ada).
-- ============================================================

-- 1. Kolom vertical
alter table public.projects  add column if not exists vertical text default 'KC';
alter table public.profiles  add column if not exists vertical text;

-- 'KIG' dipakai untuk project lintas grup (terlihat semua vertical)
update public.projects set vertical = 'KIG' where name = 'KIG Media Film';

-- 2. Helper
create or replace function public.my_vertical()
returns text
language sql security definer stable set search_path = public
as $$
  select vertical from public.profiles where id = auth.uid() and is_active;
$$;

create or replace function public.is_superadmin()
returns boolean
language sql security definer stable set search_path = public
as $$
  select coalesce(public.my_role() = 'superadmin', false);
$$;

-- Boleh melihat project ini?
create or replace function public.can_see_project(p uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select
    public.is_superadmin()
    or p is null
    or exists (
      select 1 from public.projects pr
      where pr.id = p
        and (
          pr.vertical is null
          or pr.vertical = 'KIG'
          or public.my_vertical() is null
          or pr.vertical = public.my_vertical()
        )
    );
$$;

-- 3. Policy PROJECTS
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select to authenticated
  using (
    public.my_role() is not null
    and (
      public.is_superadmin()
      or vertical is null
      or vertical = 'KIG'
      or public.my_vertical() is null
      or vertical = public.my_vertical()
    )
  );

-- 4. Policy ACCOUNTS — ikut visibilitas project
drop policy if exists accounts_select on public.accounts;
create policy accounts_select on public.accounts
  for select to authenticated
  using (public.my_role() is not null and public.can_see_project(project_id));

-- 5. Policy CONTENTS — baca & tulis dibatasi vertical
drop policy if exists contents_select on public.contents;
create policy contents_select on public.contents
  for select to authenticated
  using (public.my_role() is not null and public.can_see_project(project_id));

drop policy if exists contents_insert on public.contents;
create policy contents_insert on public.contents
  for insert to authenticated
  with check (
    public.can_see_project(project_id)
    and (
      public.is_privileged()
      or (public.my_role() = 'tim' and public.my_team() in ('creative', 'delta') and public.team_can_target(status))
    )
  );

drop policy if exists contents_update on public.contents;
create policy contents_update on public.contents
  for update to authenticated
  using (
    public.can_see_project(project_id)
    and (public.is_privileged() or (public.my_role() = 'tim' and public.team_can_edit(status)))
  )
  with check (
    public.can_see_project(project_id)
    and (public.is_privileged() or (public.my_role() = 'tim' and public.team_can_target(status)))
  );

drop policy if exists contents_delete on public.contents;
create policy contents_delete on public.contents
  for delete to authenticated
  using (public.is_privileged() and public.can_see_project(project_id));

-- 6. Policy CONTENT_REQUESTS
drop policy if exists req_select on public.content_requests;
create policy req_select on public.content_requests
  for select to authenticated
  using (public.my_role() is not null and public.can_see_project(project_id));

drop policy if exists req_insert on public.content_requests;
create policy req_insert on public.content_requests
  for insert to authenticated
  with check (
    (public.my_team() = 'pm' or public.is_privileged())
    and requester_id = auth.uid()
    and public.can_see_project(project_id)
  );

drop policy if exists req_update on public.content_requests;
create policy req_update on public.content_requests
  for update to authenticated
  using (
    public.can_see_project(project_id)
    and (public.is_privileged() or public.my_team() in ('creative', 'delta'))
  )
  with check (
    public.can_see_project(project_id)
    and (public.is_privileged() or public.my_team() in ('creative', 'delta'))
  );

-- 7. Policy CONTENT_NOTES — ikut visibilitas kontennya
drop policy if exists notes_select on public.content_notes;
create policy notes_select on public.content_notes
  for select to authenticated
  using (
    public.my_role() is not null
    and exists (
      select 1 from public.contents c
      where c.id = content_id and public.can_see_project(c.project_id)
    )
  );

-- 8. Hanya superadmin yang boleh mengubah vertical project
drop policy if exists projects_write on public.projects;
create policy projects_write on public.projects
  for all to authenticated
  using (public.is_privileged() and (public.is_superadmin() or vertical = public.my_vertical() or vertical = 'KIG'))
  with check (public.is_privileged() and (public.is_superadmin() or vertical = public.my_vertical() or vertical = 'KIG'));

-- ============================================================
-- SETELAH MIGRATION:
-- Set vertical tiap user (superadmin biarkan NULL agar lihat semua):
--   update public.profiles set vertical = 'KC'  where email = 'orang.kc@...';
--   update public.profiles set vertical = 'GME' where email = 'orang.gme@...';
-- Cek: select name, vertical from projects;
-- ============================================================
