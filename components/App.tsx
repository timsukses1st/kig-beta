'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { initials, type Account, type Profile } from '@/lib/types';
import Login from '@/components/Login';
import Board from '@/components/Board';
import LogView from '@/components/LogView';
import AccessView from '@/components/AccessView';

type View = 'board' | 'kalender' | 'tracker' | 'ads' | 'log' | 'access';

const NAV: { key: View; label: string }[] = [
  { key: 'board', label: 'Board Pipeline' },
  { key: 'kalender', label: 'Kalender Tayang' },
  { key: 'tracker', label: 'Tracker' },
  { key: 'ads', label: 'Ads Tracker' },
  { key: 'log', label: 'Log Aktivitas' },
  { key: 'access', label: 'Kelola Akses' },
];

function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="content-area">
      <div className="placeholder-page">
        <div className="ph-badge">Fase berikutnya</div>
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = useState<string>('all');
  const [accMenuOpen, setAccMenuOpen] = useState(false);
  const [view, setView] = useState<View>('board');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const saved = window.localStorage?.getItem('beta-theme');
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { window.localStorage?.setItem('beta-theme', theme); } catch {}
  }, [theme]);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile((data as Profile) || null);
  }, []);

  const loadAccounts = useCallback(async () => {
    const { data } = await supabase.from('accounts').select('*').eq('is_active', true).order('handle');
    setAccounts((data as Account[]) || []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id);
        loadAccounts();
      }
      setBooting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) {
        loadProfile(s.user.id);
        loadAccounts();
      } else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile, loadAccounts]);

  if (booting) return null;
  if (!session) return <Login />;

  const isSuper = profile?.role === 'superadmin';
  const canSeeLog = profile?.role === 'superadmin' || profile?.role === 'manager';
  const navItems = NAV.filter((n) => {
    if (n.key === 'access') return isSuper;
    if (n.key === 'log') return canSeeLog;
    return true;
  });

  const activeAcc = accounts.find((a) => a.id === activeAccount) || null;
  const displayName = profile?.full_name || session.user.email?.split('@')[0] || 'User';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">β</div>
          <div>
            <h1>Beta</h1>
            <div className="brand-sub">CONTENT LAUNCH</div>
          </div>
        </div>

        <div className="section-label">Akun</div>
        <button className="account-picker" onClick={() => setAccMenuOpen(!accMenuOpen)}>
          <div className="acc-avatar">{activeAcc ? initials(activeAcc.handle.replace('@', '')) : '∗'}</div>
          <div>
            <div className="acc-name">{activeAcc ? activeAcc.handle : 'Semua akun'}</div>
            <div className="acc-sub">{activeAcc ? activeAcc.label || 'akun media' : `${accounts.length} akun aktif`}</div>
          </div>
          <span className="acc-caret">{accMenuOpen ? '▴' : '▾'}</span>
        </button>
        {accMenuOpen && (
          <div className="account-menu">
            <button className="account-option" onClick={() => { setActiveAccount('all'); setAccMenuOpen(false); }}>
              <div className="acc-avatar" style={{ background: 'var(--raised)', color: 'var(--text)' }}>∗</div>
              <div className="acc-name">Semua akun</div>
              {activeAccount === 'all' && <span className="check">✓</span>}
            </button>
            {accounts.map((a) => (
              <button key={a.id} className="account-option" onClick={() => { setActiveAccount(a.id); setAccMenuOpen(false); }}>
                <div className="acc-avatar">{initials(a.handle.replace('@', ''))}</div>
                <div>
                  <div className="acc-name">{a.handle}</div>
                  {a.label && <div className="acc-sub">{a.label}</div>}
                </div>
                {activeAccount === a.id && <span className="check">✓</span>}
              </button>
            ))}
          </div>
        )}

        <div className="section-label">Menu</div>
        {navItems.map((n) => (
          <button key={n.key} className={`nav-item ${view === n.key ? 'active' : ''}`} onClick={() => setView(n.key)}>
            <span className="dot" />
            {n.label}
          </button>
        ))}

        <div className="sidebar-footer">
          <button className="btn ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀ Mode terang' : '☾ Mode gelap'}
          </button>
          <div className="user-chip">
            <div className="user-avatar">{initials(displayName)}</div>
            <div>
              <div className="u-name">{displayName}</div>
              <div className="u-role">{profile ? `${profile.role}${profile.team ? ' · ' + profile.team : ''}` : '…'}</div>
            </div>
            <button className="icon-btn" title="Keluar" onClick={() => supabase.auth.signOut()}>⎋</button>
          </div>
        </div>
      </aside>

      <main className="main">
        {view === 'board' && <Board profile={profile} accounts={accounts} accountFilter={activeAccount} />}
        {view === 'kalender' && (
          <Placeholder
            title="Kalender Tayang"
            desc="Tampilan kalender bulanan berisi konten terjadwal & tayang. Menyusul di fase berikutnya — datanya (tanggal tayang) sudah mulai terkumpul dari Board sekarang."
          />
        )}
        {view === 'tracker' && (
          <Placeholder
            title="Tracker Distribution"
            desc="Tracker hashtag, buzzer, dan community seeding per konten. Menyusul di fase berikutnya sesuai blueprint."
          />
        )}
        {view === 'ads' && (
          <Placeholder
            title="Ads Tracker"
            desc="Rekap budget, status kampanye, kode ads, dan hasil reach per konten yang diiklankan. Menyusul di fase berikutnya."
          />
        )}
        {view === 'log' && canSeeLog && <LogView />}
        {view === 'access' && isSuper && <AccessView selfId={session.user.id} />}
      </main>
    </div>
  );
}
