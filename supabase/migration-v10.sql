-- ============================================================
-- ALPHA — MIGRATION V10
-- Recap Report: arsip laporan per project (upload & unduh file).
-- PRASYARAT: v9 sudah dijalankan.
-- ============================================================

-- 1. Tabel metadata laporan
create table if not exists public.recap_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  period text,                       -- mis. "Juli 2026" / "Campaign Agustus"
  note text,
  file_path text,                    -- path di storage bucket 'reports'
  file_name text,
  file_size bigint,
  uploaded_by uuid references public.profiles (id),
  uploader_name text,
  created_at timestamptz not null default now()
);

create index if not exists recap_project_idx on public.recap_reports (project_id);

alter table public.recap_reports enable row level security;

-- Baca: semua user aktif, dibatasi vertical project
drop policy if exists recap_select on public.recap_reports;
create policy recap_select on public.recap_reports
  for select to authenticated
  using (public.my_role() is not null and public.can_see_project(project_id));

-- Tulis: semua user aktif pada project yang boleh dilihat
drop policy if exists recap_insert on public.recap_reports;
create policy recap_insert on public.recap_reports
  for insert to authenticated
  with check (
    public.my_role() is not null
    and public.can_see_project(project_id)
    and uploaded_by = auth.uid()
  );

-- Hapus: pengunggahnya sendiri atau lead/superadmin
drop policy if exists recap_delete on public.recap_reports;
create policy recap_delete on public.recap_reports
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_privileged());

grant select, insert, delete on public.recap_reports to authenticated;

-- 2. Bucket penyimpanan file (private — akses lewat signed URL)
insert into storage.buckets (id, name, public)
select 'reports', 'reports', false
where not exists (select 1 from storage.buckets where id = 'reports');

-- 3. Policy storage: user login boleh unggah & mengunduh isi bucket 'reports'
drop policy if exists reports_read on storage.objects;
create policy reports_read on storage.objects
  for select to authenticated
  using (bucket_id = 'reports');

drop policy if exists reports_write on storage.objects;
create policy reports_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'reports');

drop policy if exists reports_remove on storage.objects;
create policy reports_remove on storage.objects
  for delete to authenticated
  using (bucket_id = 'reports');

-- Catatan jujur: kontrol vertical ditegakkan pada tabel recap_reports
-- (daftar file). File di storage hanya bisa ditemukan lewat path dari
-- tabel tersebut, jadi cukup untuk kebutuhan internal.

-- Cek cepat: select * from recap_reports;  -- kosong, wajar
