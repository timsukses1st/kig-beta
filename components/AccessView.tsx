'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { initials, type Profile, type Role, type Team } from '@/lib/types';

const ROLES: Role[] = ['superadmin', 'manager', 'tim'];
const TEAMS: (Team | '')[] = ['', 'delta', 'creative', 'distribution', 'ads'];

export default function AccessView({ selfId }: { selfId: string }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    setUsers((data as Profile[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async (id: string, patch: Partial<Profile>) => {
    setMsg('');
    const { error } = await supabase.from('profiles').update(patch).eq('id', id);
    if (error) { setMsg('Gagal menyimpan perubahan akses.'); return; }
    setMsg('Perubahan tersimpan.');
    load();
  };

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <h2>Kelola Akses</h2>
          <span className="top-note">khusus superadmin</span>
        </div>
      </div>
      <div className="content-area">
        <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 14 }}>
          Tambah user baru: Supabase Dashboard → Authentication → Add user — user otomatis muncul di daftar ini.
          Tombol undang langsung dari app menyusul di fase berikutnya.
        </p>
        <div className="table-wrap">
          {loading ? (
            <p className="empty">Memuat pengguna…</p>
          ) : (
            <table>
              <thead>
                <tr><th>User</th><th>Role</th><th>Team</th><th>Status</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="row-avatar">{initials(u.full_name || u.email)}</span>
                      <b>{u.full_name || '(tanpa nama)'}</b>
                      <div className="sub" style={{ marginLeft: 40 }}>{u.email}</div>
                    </td>
                    <td>
                      <select
                        value={u.role}
                        disabled={u.id === selfId}
                        style={u.role === 'superadmin' ? { color: 'var(--st-review)', borderColor: 'var(--st-review)' } :
                          u.role === 'manager' ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}
                        onChange={(e) => update(u.id, { role: e.target.value as Role })}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={u.team || ''} onChange={(e) => update(u.id, { team: (e.target.value || null) as Team | null })}>
                        {TEAMS.map((t) => <option key={t} value={t}>{t || '—'}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className="btn ghost" disabled={u.id === selfId} onClick={() => update(u.id, { is_active: !u.is_active })}>
                        <span className="status-dot" style={{ background: u.is_active ? 'var(--green)' : 'var(--text-3)' }} />
                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {msg && <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-2)' }}>{msg}</p>}
      </div>
    </>
  );
}
