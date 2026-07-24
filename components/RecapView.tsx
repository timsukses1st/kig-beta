'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { initials, type Profile, type Project, type RecapReport } from '@/lib/types';

interface Props {
  profile: Profile | null;
  projects: Project[];
  projectFilter: string;
}

const MAX_MB = 20;

const fmtSize = (b: number | null) => {
  if (!b) return '—';
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
};

export default function RecapView({ profile, projects, projectFilter }: Props) {
  const [rows, setRows] = useState<RecapReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', period: '', note: '', project_id: '' });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('recap_reports').select('*').order('created_at', { ascending: false });
    if (projectFilter !== 'all') q = q.eq('project_id', projectFilter);
    const { data } = await q;
    setRows((data as RecapReport[]) || []);
    setLoading(false);
  }, [projectFilter]);

  useEffect(() => { load(); }, [load]);

  const openModal = () => {
    setForm({
      title: '',
      period: '',
      note: '',
      project_id: projectFilter !== 'all' ? projectFilter : (projects[0]?.id || ''),
    });
    setFile(null);
    setError('');
    setOpen(true);
  };

  const submit = async () => {
    if (!profile) return;
    if (!form.title.trim()) { setError('Judul laporan wajib diisi.'); return; }
    if (file && file.size > MAX_MB * 1024 * 1024) {
      setError(`Ukuran file maksimal ${MAX_MB} MB. Untuk file besar, unggah ke Drive lalu tempel linknya di catatan.`);
      return;
    }
    setBusy(true);
    setError('');

    let filePath: string | null = null;
    if (file) {
      const safe = file.name.replace(/[^\w.\-]+/g, '_');
      filePath = `${form.project_id || 'umum'}/${Date.now()}_${safe}`;
      const up = await supabase.storage.from('reports').upload(filePath, file);
      if (up.error) {
        setBusy(false);
        setError('Gagal mengunggah file. Cek koneksi atau ukuran file.');
        return;
      }
    }

    const { error: err } = await supabase.from('recap_reports').insert({
      project_id: form.project_id || null,
      title: form.title.trim(),
      period: form.period.trim() || null,
      note: form.note.trim() || null,
      file_path: filePath,
      file_name: file?.name || null,
      file_size: file?.size || null,
      uploaded_by: profile.id,
      uploader_name: profile.full_name || profile.email,
    });
    setBusy(false);
    if (err) { setError('Gagal menyimpan data laporan.'); return; }
    setOpen(false);
    load();
  };

  const download = async (r: RecapReport) => {
    if (!r.file_path) return;
    const { data, error: err } = await supabase.storage.from('reports').createSignedUrl(r.file_path, 60);
    if (err || !data) { window.alert('Gagal membuka file.'); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const remove = async (r: RecapReport) => {
    if (!window.confirm(`Hapus laporan "${r.title}"?`)) return;
    if (r.file_path) await supabase.storage.from('reports').remove([r.file_path]);
    const { error: err } = await supabase.from('recap_reports').delete().eq('id', r.id);
    if (err) { window.alert('Gagal menghapus — hanya pengunggah atau lead.'); return; }
    load();
  };

  const projName = (id: string | null) => projects.find((p) => p.id === id)?.name || '—';
  const canDelete = (r: RecapReport) =>
    profile?.id === r.uploaded_by || profile?.role === 'superadmin' || profile?.role === 'manager';

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <h2>Recap Report</h2>
          <span className="top-note">{rows.length} laporan</span>
        </div>
        <div className="top-actions">
          <button className="btn primary" onClick={openModal}>+ Unggah laporan</button>
        </div>
      </div>

      <div className="content-area">
        <div className="table-wrap">
          {loading ? (
            <p className="empty">Memuat laporan…</p>
          ) : rows.length === 0 ? (
            <p className="empty">Belum ada laporan. Unggah rekap mingguan/bulanan agar tersimpan rapi per project.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Laporan</th><th>Project</th><th>Periode</th><th>File</th><th>Diunggah</th><th style={{ width: 150 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.title}</b>
                      {r.note && <div className="sub" style={{ fontFamily: 'inherit' }}>{r.note}</div>}
                    </td>
                    <td>{projName(r.project_id)}</td>
                    <td>{r.period || '—'}</td>
                    <td>
                      {r.file_name ? (
                        <>
                          <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.file_name}</div>
                          <div className="sub">{fmtSize(r.file_size)}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td>
                      <span className="row-avatar">{initials(r.uploader_name)}</span>
                      {r.uploader_name}
                      <div className="sub" style={{ marginLeft: 40 }}>
                        {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td>
                      {r.file_path && <button className="btn ghost" onClick={() => download(r)}>↓ Unduh</button>}
                      {canDelete(r) && <button className="btn ghost danger-text" onClick={() => remove(r)}>Hapus</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="cal-legend">
          Maksimal {MAX_MB} MB per file (PDF, gambar, spreadsheet). File video sebaiknya tetap di Drive — cukup tempel linknya di catatan.
        </p>
      </div>

      {open && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-head">
              <div>
                <div className="modal-eyebrow">
                  <span className="sq" style={{ background: 'var(--accent)' }} />
                  Recap Report
                </div>
                <div className="modal-title">Unggah Laporan</div>
                <div className="modal-sub">Arsip laporan per project — bisa diunduh anggota tim yang punya akses project ini.</div>
              </div>
              <button className="btn ghost modal-close" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div style={{ padding: '18px 24px' }}>
              <div className="field">
                <label>Judul laporan</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="mis. Rekap performa konten Juli"
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Project</label>
                  <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                    <option value="">— umum —</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Periode</label>
                  <input
                    value={form.period}
                    onChange={(e) => setForm({ ...form, period: e.target.value })}
                    placeholder="mis. Juli 2026"
                  />
                </div>
              </div>
              <div className="field">
                <label>File laporan</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.docx,.pptx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <div className="hint">{file ? `${file.name} · ${fmtSize(file.size)}` : `Opsional · maks ${MAX_MB} MB`}</div>
              </div>
              <div className="field">
                <label>Catatan</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Ringkasan singkat / link Drive bila file besar"
                />
              </div>
              {error && <p className="error-msg">{error}</p>}
            </div>
            <div className="modal-foot">
              <div className="right">
                <button className="btn" onClick={() => setOpen(false)} disabled={busy}>Batal</button>
                <button className="btn primary" onClick={submit} disabled={busy || !form.title.trim()}>
                  {busy ? 'Mengunggah…' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
