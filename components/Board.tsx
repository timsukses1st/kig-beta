'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ACCOUNTS,
  FORMATS,
  PILLARS,
  STATUSES,
  canEditRow,
  targetableStatuses,
  type ContentRow,
  type ContentStatus,
  type Profile,
} from '@/lib/types';

interface Props {
  profile: Profile | null;
}

const EMPTY_FORM = {
  title: '',
  account: ACCOUNTS[0],
  pillar: PILLARS[0],
  format: FORMATS[0],
  status: 'ide' as ContentStatus,
  pic: '',
  scheduled_at: '',
  published_url: '',
  notes: '',
};

export default function Board({ profile }: Props) {
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContentRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('contents')
      .select('*')
      .order('updated_at', { ascending: false });
    setRows((data as ContentRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byStatus = useMemo(() => {
    const map: Record<string, ContentRow[]> = {};
    for (const s of STATUSES) map[s.key] = [];
    for (const r of rows) (map[r.status] || (map[r.status] = [])).push(r);
    return map;
  }, [rows]);

  const canCreate =
    !!profile &&
    (profile.role === 'superadmin' ||
      profile.role === 'manager' ||
      profile.team === 'creative' ||
      profile.team === 'delta');

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (row: ContentRow) => {
    if (!canEditRow(profile, row.status)) return;
    setEditing(row);
    setForm({
      title: row.title,
      account: row.account,
      pillar: row.pillar,
      format: row.format,
      status: row.status,
      pic: row.pic || '',
      scheduled_at: row.scheduled_at ? row.scheduled_at.slice(0, 16) : '',
      published_url: row.published_url || '',
      notes: row.notes || '',
    });
    setError('');
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      setError('Judul konten wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      title: form.title.trim(),
      account: form.account,
      pillar: form.pillar,
      format: form.format,
      status: form.status,
      pic: form.pic.trim() || null,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      published_url: form.published_url.trim() || null,
      notes: form.notes.trim() || null,
    };
    let err = null;
    if (editing) {
      const res = await supabase.from('contents').update(payload).eq('id', editing.id);
      err = res.error;
    } else {
      const res = await supabase.from('contents').insert({ ...payload, created_by: profile?.id || null });
      err = res.error;
    }
    setSaving(false);
    if (err) {
      setError('Gagal menyimpan. Cek hak akses tim kamu untuk tahap ini.');
      return;
    }
    setModalOpen(false);
    load();
  };

  const remove = async () => {
    if (!editing) return;
    if (!window.confirm(`Hapus konten "${editing.title}"?`)) return;
    setSaving(true);
    const { error: err } = await supabase.from('contents').delete().eq('id', editing.id);
    setSaving(false);
    if (err) {
      setError('Gagal menghapus. Hanya superadmin/manager yang bisa menghapus.');
      return;
    }
    setModalOpen(false);
    load();
  };

  const statusOptions = targetableStatuses(profile, editing ? editing.status : 'ide');
  const canDelete = profile?.role === 'superadmin' || profile?.role === 'manager';

  const fmtDate = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Board Konten</h2>
          <p>Pipeline produksi: Creative → Distribution → Ads</p>
        </div>
        {canCreate && (
          <button className="btn primary" onClick={openCreate}>
            + Konten baru
          </button>
        )}
      </div>

      {loading ? (
        <p className="empty">Memuat board…</p>
      ) : (
        <div className="board">
          {STATUSES.map((s) => (
            <div className="column" key={s.key}>
              <div className="column-head">
                <h3>{s.label}</h3>
                <span className="count">{byStatus[s.key].length}</span>
              </div>
              <div className="column-team">Tim {s.ownerTeam}</div>
              <div className="cards">
                {byStatus[s.key].map((row) => {
                  const editable = canEditRow(profile, row.status);
                  return (
                    <button
                      key={row.id}
                      className={`card ${editable ? '' : 'locked'}`}
                      onClick={() => openEdit(row)}
                      title={editable ? 'Klik untuk edit' : 'Tahap ini dikelola tim lain'}
                    >
                      <div className="card-title">{row.title}</div>
                      <div className="card-meta">
                        <span className="tag pillar">{row.pillar}</span>
                        <span className="tag">{row.account}</span>
                        <span className="tag">{row.format}</span>
                      </div>
                      <div className="card-foot">
                        <span>{row.pic || '—'}</span>
                        <span>{row.scheduled_at ? '📅 ' + fmtDate(row.scheduled_at) : ''}</span>
                      </div>
                    </button>
                  );
                })}
                {byStatus[s.key].length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '6px 4px' }}>Kosong</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <h3>{editing ? 'Edit Konten' : 'Konten Baru'}</h3>
            <div className="field">
              <label>Judul konten</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="cth: 5 Film Indonesia Hidden Gem Juli"
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Akun</label>
                <select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
                  {ACCOUNTS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Pilar</label>
                <select value={form.pillar} onChange={(e) => setForm({ ...form, pillar: e.target.value })}>
                  {PILLARS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Format</label>
                <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ContentStatus })}
                >
                  {STATUSES.filter((s) => statusOptions.includes(s.key)).map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>PIC</label>
                <input value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} placeholder="Nama penanggung jawab" />
              </div>
              <div className="field">
                <label>Jadwal tayang</label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label>Link publish (setelah tayang)</label>
              <input
                value={form.published_url}
                onChange={(e) => setForm({ ...form, published_url: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="field">
              <label>Catatan</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <div className="modal-actions">
              {editing && canDelete && (
                <button className="btn danger" onClick={remove} disabled={saving}>
                  Hapus
                </button>
              )}
              <div className="right">
                <button className="btn" onClick={() => setModalOpen(false)} disabled={saving}>
                  Batal
                </button>
                <button className="btn primary" onClick={save} disabled={saving}>
                  {saving ? 'Menyimpan…' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
