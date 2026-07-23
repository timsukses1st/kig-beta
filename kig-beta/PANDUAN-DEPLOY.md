# Panduan Deploy — Beta (Content Launch System)

Total waktu: ±20 menit. Biaya: Rp0 (semua free tier).

## Tahap 1 — Supabase (±7 menit)

1. Buka [supabase.com](https://supabase.com) → org **delt4proxy** → **New project**.
   - Name: `kig-beta` · Region: Southeast Asia (Singapore) · Password DB: simpan baik-baik.
2. Setelah project jadi → **SQL Editor** → New query → paste seluruh isi `supabase/schema.sql` → **Run**.
   - Harus muncul "Success. No rows returned".
3. **Authentication → Users → Add user** → buat akun kamu (email + password, centang Auto Confirm).
4. Kembali ke **SQL Editor**, jalankan (ganti emailnya):
   ```sql
   update public.profiles set role = 'superadmin', team = 'delta'
   where email = 'EMAIL_KAMU_DISINI';
   ```
5. Catat dua nilai dari **Project Settings → API**:
   - `Project URL` → untuk `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → untuk `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Tahap 2 — GitHub (±5 menit)

1. Buat repo baru: **timsukses1st/kig-beta** (private).
2. Upload semua file project ini (folder `app/`, `components/`, `lib/`, `supabase/`, plus `package.json`, `next.config.mjs`, `tsconfig.json`, `.gitignore`).
   - Cara termudah: repo kosong → "uploading an existing file" → drag semua isi folder.
   - JANGAN upload `node_modules/` dan `.next/` (sudah di-ignore).

## Tahap 3 — Vercel (±5 menit)

1. Vercel → **Add New → Project** → Import `timsukses1st/kig-beta`.
2. Framework terdeteksi otomatis: Next.js. Jangan ubah apa pun.
3. Di bagian **Environment Variables**, tambahkan:
   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL dari Tahap 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key dari Tahap 1 |
4. **Deploy** → tunggu ±2 menit → buka URL live → login pakai akun Tahap 1.

## Tahap 4 — Tambah anggota tim

1. Supabase → Authentication → **Add user** (buat akun tiap anggota).
2. Login ke Beta sebagai superadmin → menu **Kelola Akses** → set role & tim tiap orang:
   - Creative → tim `creative` · Distribution → `distribution` · Ads → `ads`
   - Lead/pengawas/COO → role `manager`

## Aturan akses (ringkas)

| Role/Tim | Bisa apa |
|---|---|
| superadmin | Semua + kelola akses |
| manager | Lihat & edit semua konten, tidak bisa kelola user |
| tim creative | Buat konten baru; edit tahap Ide/Drafting/Review; handoff ke Siap Upload |
| tim distribution | Edit Siap Upload/Terjadwal; handoff ke Published |
| tim ads | Edit tahap Published |

Semua orang bisa MELIHAT seluruh board (konteks), tapi hanya bisa EDIT tahap timnya — dijaga di level database (RLS), bukan cuma di tampilan.

## Troubleshooting

- **Login berhasil tapi board kosong/error** → cek profil kamu di tabel `profiles` (role & is_active).
- **"Gagal menyimpan"** → status tujuan di luar wewenang tim; itu RLS bekerja, bukan bug.
- **User baru tidak muncul di Kelola Akses** → pastikan dibuat lewat Authentication → Add user (trigger auto-buat profil).
