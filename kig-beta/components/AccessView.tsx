'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, Role, Team } from '@/lib/types';

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

  useEffect(() => {
    load();
  }, [load]);

  const update = async (id: string, patch: Partial<Profile>) => {
    setMsg('');
    const { error } = await supabase.from('profiles').update(patch).eq('id', id);
    if (error) {
      setMsg('Gagal menyimpan perubahan akses.');
      return;
    }
    setMsg('Perubahan tersimpan.');
    load();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Kelola Akses</h2>
          <p>
            Atur role &amp; tim tiap pengguna. Tambah user baru: Supabase Dashboard → Authentication → Add user,
            lalu user akan muncul di sini.
          </p>
        </div>
      </div>
      <div className="table-wrap">
        {loading ? (
          <p className="empty">Memuat pengguna…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Pengguna</th>
                <th>Role</th>
                <th>Tim</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.full_name || '(tanpa nama)'}</b>
                    <div style={{ fontSize: 12 }}>{u.email}</div>
                  </td>
                  <td>
                    <select
                      value={u.role}
                      disabled={u.id === selfId}
                      onChange={(e) => update(u.id, { role: e.target.value as Role })}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={u.team || ''}
                      onChange={(e) => update(u.id, { team: (e.target.value || null) as Team | null })}
                    >
                      {TEAMS.map((t) => (
                        <option key={t} value={t}>{t || '—'}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className="btn ghost"
                      disabled={u.id === selfId}
                      onClick={() => update(u.id, { is_active: !u.is_active })}
                    >
                      {u.is_active ? '✓ Aktif' : '✕ Nonaktif'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {msg && <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-2)' }}>{msg}</p>}
    </>
  );
}
