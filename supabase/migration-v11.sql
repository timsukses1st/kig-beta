-- ============================================================
-- ALPHA — MIGRATION V11
-- Recap Report: dukungan laporan berupa LINK (Google Slides/Docs/Sheets/Drive).
-- PRASYARAT: v10 sudah dijalankan.
-- ============================================================

alter table public.recap_reports add column if not exists link_url text;
alter table public.recap_reports add column if not exists link_type text;  -- slides / docs / sheets / drive / lainnya

-- Cek cepat: select title, file_name, link_url from recap_reports;
