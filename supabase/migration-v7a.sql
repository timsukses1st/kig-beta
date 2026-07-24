-- ============================================================
-- ALPHA — MIGRATION V7a (JALANKAN INI DULU, SENDIRIAN)
-- Tambah tim 'pm' (Project Manager) ke enum tim.
-- PENTING: Postgres mengharuskan penambahan nilai enum di-commit
-- dulu sebelum dipakai — makanya dipisah dari v7b. Run ini, lalu
-- run v7b sebagai query TERPISAH.
-- ============================================================
alter type app_team add value if not exists 'pm';
