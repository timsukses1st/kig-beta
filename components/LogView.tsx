'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ActivityLog } from '@/lib/types';

export default function LogView() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setLogs((data as ActivityLog[]) || []);
        setLoading(false);
      });
  }, []);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Log Aktivitas</h2>
          <p>200 aktivitas terakhir di seluruh sistem</p>
        </div>
      </div>
      <div className="table-wrap">
        {loading ? (
          <p className="empty">Memuat log…</p>
        ) : logs.length === 0 ? (
          <p className="empty">Belum ada aktivitas tercatat.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Pengguna</th>
                <th>Aksi</th>
                <th>Konten</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmt(l.created_at)}</td>
                  <td>{l.actor_email || 'sistem'}</td>
                  <td><b>{l.action}</b></td>
                  <td>{l.entity_title || l.entity}</td>
                  <td>{l.detail || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
