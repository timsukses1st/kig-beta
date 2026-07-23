'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  DIVISIONS, PILLAR_LABEL, STATUSES,
  canEditRow, initials, statusDef, targetableStatuses,
  type Account, type ContentRow, type ContentStatus, type Division, type Pillar, type Profile, type TeamMember,
} from '@/lib/types';

interface Props {
  profile: Profile | null;
  accounts: Account[];
  accountFilter: string; // 'all' | account id
}

type Range = 'today' | 'yesterday' | 'week' | 'all';

const EMPTY_FORM = {
  title: '',
  account_id: '',
  pillar: 'lagi_ramai' as Pillar,
  status: 'ide' as ContentStatus,
  pic_creative: '',
  pic_distribution: '',
  pic_ads: '',
  deadline: '',
  publish_date: '',
  caption: '',
  asset_url: '',
  visual_hook: '',
  production_note: '',
  potensi_fyp: false,
};

export default function Board({ profile, accounts, accountFilter }: Props) {
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [division, setDivision] = useState<Division>('semua');
  const [range, setRange] = useState<Range>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContentRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [c, m] = await Promise.all([
      supabase.from('contents').select('*').order('updated_at', { ascending: false }),
      supabase.from('team_members').select('*').eq('is_active', true).order('name'),
    ]);
    setRows((c.data as ContentRow[]) || []);
    setMembers((m.data as TeamMember[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const inRange = useCallback((r: ContentRow) => {
    if (range === 'all') return true;
    const d = new Date(r.updated_at);
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (range === 'today') return d >= startToday;
    if (range === 'yesterday') {
      const startYest = new Date(startToday); startYest.setDate(startYest.getDate() - 1);
      return d >= startYest && d < startToday;
    }
    const start7 = new Date(startToday); start7.setDate(start7.getDate() - 6);
    return d >= start7;
  }, [range]);

  const filtered = useMemo(
    () => rows.filter((r) => (accountFilter === 'all' || r.account_id === accountFilter) && inRange(r)),
    [rows, accountFilter, inRange]
  );

  const divCounts = useMemo(() => {
    const m: Record<Division, number> = { semua: filtered.length, creative: 0, distribution: 0, ads: 0 };
    for (const r of filtered) {
      const t = statusDef(r.status).ownerTeam;
      if (t === 'creative') m.creative++;
      else if (t === 'distribution') m.distribution++;
      else if (t === 'ads') m.ads++;
    }
    return m;
  }, [filtered]);

  const activeDiv = DIVISIONS.find((d) => d.key === division)!;
  const columns = activeDiv.statuses.map((k) => statusDef(k));
  const byStatus = useMemo(() => {
    const m: Record<string, ContentRow[]> = {};
    for (const s of STATUSES) m[s.key] = [];
    for (const r of filtered) (m[r.status] || (m[r.status] = [])).push(r);
    return m;
  }, [filtered]);

  const accName = (id: string | null) => accounts.find((a) => a.id === id)?.handle || 'Akun belum ditentukan';
  const personName = (id: string | null) => members.find((m) => m.id === id)?.name || null;
  const membersOf = (team: 'creative' | 'distribution' | 'ads') =>
    members.filter((m) => m.team === team || m.team === 'delta');
  const picForCard = (r: ContentRow) => {
    const team = statusDef(r.status).ownerTeam;
    const id = team === 'creative' ? r.pic_creative : team === 'distribution' ? r.pic_distribution : r.pic_ads;
    return personName(id);
  };

  const canCreate =
    !!profile &&
    (profile.role === 'superadmin' || profile.role === 'manager' ||
      profile.team === 'creative' || profile.team === 'delta');

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, account_id: accountFilter !== 'all' ? accountFilter : (accounts[0]?.id || '') });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (row: ContentRow) => {
    setEditing(row);
    setForm({
      title: row.title,
      account_id: row.account_id || '',
      pillar: row.pillar,
      status: row.status,
      pic_creative: row.pic_creative || '',
      pic_distribution: row.pic_distribution || '',
      pic_ads: row.pic_ads || '',
      deadline: row.deadline || '',
      publish_date: row.publish_date || '',
      caption: row.caption || '',
      asset_url: row.asset_url || '',
      visual_hook: row.visual_hook || '',
      production_note: row.production_note || '',
      potensi_fyp: row.potensi_fyp,
    });
    setError('');
    setModalOpen(true);
  };

  const readOnly = editing ? !canEditRow(profile, editing.status) : false;

  const save = async () => {
    if (!form.title.trim()) { setError('Hook / brief konten wajib diisi.'); return; }
    setSaving(true); setError('');
    const payload = {
      title: form.title.trim(),
      account_id: form.account_id || null,
      pillar: form.pillar,
      status: form.status,
      pic_creative: form.pic_creative || null,
      pic_distribution: form.pic_distribution || null,
      pic_ads: form.pic_ads || null,
      deadline: form.deadline || null,
      publish_date: form.publish_date || null,
      caption: form.caption.trim() || null,
      asset_url: form.asset_url.trim() || null,
      visual_hook: form.visual_hook.trim() || null,
      production_note: form.production_note.trim() || null,
      potensi_fyp: form.potensi_fyp,
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
    if (err) { setError('Gagal menyimpan. Cek wewenang tim kamu untuk tahap ini.'); return; }
    setModalOpen(false);
    load();
  };

  const remove = async () => {
    if (!editing) return;
    if (!window.confirm(`Hapus konten "${editing.title}"?`)) return;
    setSaving(true);
    const { error: err } = await supabase.from('contents').delete().eq('id', editing.id);
    setSaving(false);
    if (err) { setError('Gagal menghapus. Hanya superadmin/manager yang bisa menghapus.'); return; }
    setModalOpen(false);
    load();
  };

  const statusOptions = targetableStatuses(profile, editing ? editing.status : 'ide');
  const canDelete = profile?.role === 'superadmin' || profile?.role === 'manager';
  const editingDef = statusDef(form.status);

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <h2>Board Pipeline</h2>
          <span className="top-note">{filtered.length} konten</span>
        </div>
        <div className="top-actions">
          {canCreate && <button className="btn primary" onClick={openCreate}>+ Konten baru</button>}
        </div>
      </div>

      <div className="div-tabs">
        {DIVISIONS.map((d) => (
          <button key={d.key} className={`div-tab ${division === d.key ? 'active' : ''}`} onClick={() => setDivision(d.key)}>
            <span className="div-dot" style={{ background: d.color }} />
            {d.label}
            <span className="div-count">{divCounts[d.key]}</span>
          </button>
        ))}
      </div>

      <div className="div-desc">
        <span className="bar" style={{ background: activeDiv.color }} />
        <span className="div-name">{division === 'semua' ? 'Semua Divisi' : `Divisi ${activeDiv.label}`}</span>
        <span>· {activeDiv.desc}</span>
        <div className="range-tabs">
          {([['today', 'Hari ini'], ['yesterday', 'Kemarin'], ['week', '7 Hari'], ['all', 'Semua']] as [Range, string][]).map(([k, label]) => (
            <button key={k} className={`range-tab ${range === k ? 'active' : ''}`} onClick={() => setRange(k)}>{label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="empty">Memuat board…</p>
      ) : (
        <div className="board">
          {columns.map((s) => (
            <div className="column" key={s.key}>
              <div className="column-head">
                <span className="st-square" style={{ background: s.color }} />
                <h3 style={{ color: s.color }}>{s.label}</h3>
                <span className="count">{byStatus[s.key].length}</span>
                {division === 'semua' && <span className="owner-chip">{s.ownerTeam}</span>}
              </div>
              <div className="col-body">
                {byStatus[s.key].map((row) => {
                  const editable = canEditRow(profile, row.status);
                  const pic = picForCard(row);
                  const hasAsset = !!row.asset_url;
                  return (
                    <button
                      key={row.id}
                      className={`card ${editable ? '' : 'locked'}`}
                      style={{ ['--card-accent' as never]: statusDef(row.status).color }}
                      onClick={() => openEdit(row)}
                      title={editable ? 'Klik untuk edit' : 'Lihat detail (tahap ini dikelola tim lain)'}
                    >
                      <div className="card-title">{row.title}</div>
                      <div className="card-acc">
                        <span className="sq" />
                        {accName(row.account_id)}
                      </div>
                      <div className="card-foot">
                        <span className="flag-dot" style={{ background: hasAsset ? 'var(--green)' : 'var(--amber)' }} />
                        {hasAsset ? 'Aset siap' : 'Perlu link drive'}
                        {row.potensi_fyp && <span style={{ color: 'var(--st-review)' }}>· FYP</span>}
                        <span className="pic-avatar" title={pic || 'PIC belum di-assign'}>{initials(pic)}</span>
                      </div>
                    </button>
                  );
                })}
                {byStatus[s.key].length === 0 && <div className="col-empty">Tak ada konten pada rentang ini</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="modal-eyebrow">
                  <span className="sq" style={{ background: editingDef.color }} />
                  {editing ? `${editingDef.label} · Tim ${editingDef.ownerTeam}` : 'Konten baru · Creative'}
                </div>
                <div className="modal-title">{editing ? 'Detail Konten' : 'Buat brief konten baru'}</div>
                <div className="modal-sub">
                  {readOnly
                    ? 'Mode lihat — tahap ini dikelola tim lain.'
                    : 'Creative mengisi brief & aset. Caption, jadwal, dan ads menyusul di Distribution & Ads.'}
                </div>
              </div>
              <button className="btn ghost modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div>
                <div className="modal-col-label">Brief utama</div>
                <div className="field">
                  <label>Hook / Brief</label>
                  <textarea
                    value={form.title}
                    disabled={readOnly}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Tulis hook & brief konten… mis. 5 film Indonesia hidden gem bulan ini"
                  />
                </div>
                <div className="field">
                  <label>Visual Hook (referensi)</label>
                  <input
                    value={form.visual_hook}
                    disabled={readOnly}
                    onChange={(e) => setForm({ ...form, visual_hook: e.target.value })}
                    placeholder="Link / nama file referensi"
                  />
                </div>
                <div className="field">
                  <label>Catatan produksi</label>
                  <textarea
                    value={form.production_note}
                    disabled={readOnly}
                    onChange={(e) => setForm({ ...form, production_note: e.target.value })}
                    placeholder="mis. Ambil 3 detik pertama · gaya cepat"
                  />
                </div>
                <div className="field">
                  <label>Caption (diisi Distribution)</label>
                  <textarea
                    value={form.caption}
                    disabled={readOnly}
                    onChange={(e) => setForm({ ...form, caption: e.target.value })}
                    placeholder="Caption final untuk upload"
                  />
                </div>
              </div>
              <div>
                <div className="modal-col-label">Detail &amp; aset</div>
                <div className="field-row">
                  <div className="field">
                    <label>Akun</label>
                    <select value={form.account_id} disabled={readOnly} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
                      <option value="">— pilih —</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.handle}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Pilar</label>
                    <select value={form.pillar} disabled={readOnly} onChange={(e) => setForm({ ...form, pillar: e.target.value as Pillar })}>
                      {(Object.keys(PILLAR_LABEL) as Pillar[]).map((p) => <option key={p} value={p}>{PILLAR_LABEL[p]}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Status</label>
                  <select value={form.status} disabled={readOnly} onChange={(e) => setForm({ ...form, status: e.target.value as ContentStatus })}>
                    {STATUSES.filter((s) => statusOptions.includes(s.key)).map((s) => (
                      <option key={s.key} value={s.key}>{s.label} · {s.ownerTeam}</option>
                    ))}
                  </select>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Deadline</label>
                    <input type="date" value={form.deadline} disabled={readOnly} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Tanggal tayang</label>
                    <input type="date" value={form.publish_date} disabled={readOnly} onChange={(e) => setForm({ ...form, publish_date: e.target.value })} />
                  </div>
                </div>
                <div className="field">
                  <label>PIC Creative</label>
                  <select value={form.pic_creative} disabled={readOnly} onChange={(e) => setForm({ ...form, pic_creative: e.target.value })}>
                    <option value="">—</option>
                    {membersOf('creative').map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>PIC Distribution</label>
                    <select value={form.pic_distribution} disabled={readOnly} onChange={(e) => setForm({ ...form, pic_distribution: e.target.value })}>
                      <option value="">—</option>
                      {membersOf('distribution').map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>PIC Ads</label>
                    <select value={form.pic_ads} disabled={readOnly} onChange={(e) => setForm({ ...form, pic_ads: e.target.value })}>
                      <option value="">—</option>
                      {membersOf('ads').map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Link Drive (aset jadi)</label>
                  <input
                    value={form.asset_url}
                    disabled={readOnly}
                    onChange={(e) => setForm({ ...form, asset_url: e.target.value })}
                    placeholder="mis. [05] FILM_2607.mov / link Drive"
                  />
                  <div className="hint">Tempel link/nama file final dari Drive. Distribution memakainya untuk upload.</div>
                </div>
                <label className="check-row">
                  <input type="checkbox" checked={form.potensi_fyp} disabled={readOnly} onChange={(e) => setForm({ ...form, potensi_fyp: e.target.checked })} />
                  Potensi FYP — sinyal ke tim Ads
                </label>
              </div>
            </div>
            <div className="modal-foot">
              <span className="foot-note">
                {error ? <span className="error-msg" style={{ margin: 0 }}>{error}</span> :
                  editing ? 'Perubahan tersimpan setelah klik Simpan.' : <>Konten akan masuk kolom <b>{editingDef.label}</b>.</>}
              </span>
              <div className="right">
                {editing && canDelete && <button className="btn danger" onClick={remove} disabled={saving}>Hapus</button>}
                <button className="btn" onClick={() => setModalOpen(false)} disabled={saving}>{readOnly ? 'Tutup' : 'Batal'}</button>
                {!readOnly && (
                  <button className="btn primary" onClick={save} disabled={saving}>
                    {saving ? 'Menyimpan…' : 'Simpan'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
