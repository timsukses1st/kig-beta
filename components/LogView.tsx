'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { initials, type ActivityLog } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
  ide: 'Ide',
  drafting: 'Drafting',
  review: 'Review',
  siap_upload: 'Siap Upload',
  terjadwal: 'Terjadwal',
  published: 'Published',
  diiklankan: 'Diiklankan',
};

// judul konten sering panjang (bold ** + link) — rapikan untuk log
const cleanTitle = (raw: string | null) => {
  if (!raw) return '';
  const t = raw
    .replace(/\*\*/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > 55 ? t.slice(0, 55).trimEnd() + '…' : t;
};

const cleanDetail = (raw: string | null) => {
  if (!raw) return '';
  return raw.replace(/[a-z_]+/g, (w) => STATUS_LABEL[w] || w);
};

const BADGE: Record<string, string> = {
  membuat: 'BUAT',
  mengubah: 'UPDATE',
  memindahkan: 'STATUS',
  menghapus: 'HAPUS',
  role_change: 'ROLE',
};

export default function LogView() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setLogs((data as ActivityLog[]) || []);
        setLoading(false);
      });
  }, []);

  const fmt = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYest = new Date(startToday); startYest.setDate(startYest.getDate() - 1);
    const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    if (d >= startToday) return `Hari ini · ${time}`;
    if (d >= startYest) return `Kemarin · ${time}`;
    return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} · ${time}`;
  };

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <h2>Log Aktivitas</h2>
          <span className="top-note">tercatat otomatis</span>
        </div>
      </div>
      <div className="content-area">
        {loading ? (
          <p className="empty">Memuat log…</p>
        ) : logs.length === 0 ? (
          <p className="empty">Belum ada aktivitas tercatat.</p>
        ) : (
          <div className="feed">
            {logs.map((l) => {
              const actor = l.actor_name || l.actor_email || 'sistem';
              return (
                <div className="feed-item" key={l.id}>
                  <div className="row-avatar">{initials(actor)}</div>
                  <div>
                    <div className="feed-text">
                      <b>{actor}</b> {l.action}{' '}
                      {l.entity_title && (
                        <span className="obj" title={l.entity_title}>&ldquo;{cleanTitle(l.entity_title)}&rdquo;</span>
                      )}
                      {l.detail && <span className="feed-detail"> — {cleanDetail(l.detail)}</span>}
                    </div>
                    <div className="feed-time">{fmt(l.created_at)}</div>
                  </div>
                  <span className="feed-badge">{BADGE[l.action] || l.entity.toUpperCase()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
