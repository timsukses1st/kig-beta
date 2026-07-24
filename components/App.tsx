'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { initials, type Account, type Profile } from '@/lib/types';
import Login from '@/components/Login';
import Board from '@/components/Board';
import LogView from '@/components/LogView';
import AccessView from '@/components/AccessView';
import CalendarView from '@/components/CalendarView';
import ReportView from '@/components/ReportView';

type View = 'board' | 'kalender' | 'tracker' | 'ads' | 'laporan' | 'log' | 'access';

const NAV: { key: View; label: string }[] = [
  { key: 'board', label: 'Board Pipeline' },
  { key: 'kalender', label: 'Kalender Tayang' },
  { key: 'tracker', label: 'Tracker' },
  { key: 'ads', label: 'Ads Tracker' },
  { key: 'laporan', label: 'Laporan Kerja' },
  { key: 'log', label: 'Log Aktivitas' },
  { key: 'access', label: 'Kelola Akses' },
];

const ICON_PATHS: Record<View, React.ReactNode> = {
  board: (
    <>
      <rect x="4" y="4" width="4.5" height="16" rx="1" />
      <rect x="10" y="4" width="4.5" height="11" rx="1" />
      <rect x="16" y="4" width="4.5" height="7" rx="1" />
    </>
  ),
  kalender: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </>
  ),
  tracker: (
    <>
      <line x1="9" y1="4" x2="7" y2="20" />
      <line x1="17" y1="4" x2="15" y2="20" />
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
    </>
  ),
  ads: (
    <>
      <path d="M3 11v3l14 4V7L3 11z" />
      <path d="M20 9.5a3 3 0 0 1 0 6" />
      <path d="M7 14.6V19a1 1 0 0 0 1 1h2" />
    </>
  ),
  laporan: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <polyline points="14 3 14 8 19 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </>
  ),
  log: (
    <>
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="5" cy="6" r="1" />
      <circle cx="5" cy="12" r="1" />
      <circle cx="5" cy="18" r="1" />
    </>
  ),
  access: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17.5" cy="9" r="2.5" />
      <path d="M16.5 14.2c2.7.4 4.5 2.6 4.5 5.3" />
    </>
  ),
};

const NavIcon = ({ view }: { view: View }) => (
  <svg className="nav-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICON_PATHS[view]}
  </svg>
);

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4.5" />
    <line x1="12" y1="2.5" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="21.5" />
    <line x1="2.5" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="21.5" y2="12" />
    <line x1="5.3" y1="5.3" x2="7" y2="7" /><line x1="17" y1="17" x2="18.7" y2="18.7" />
    <line x1="5.3" y1="18.7" x2="7" y2="17" /><line x1="17" y1="7" x2="18.7" y2="5.3" />
  </svg>
);

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const CollapseIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="9" y1="4" x2="9" y2="20" />
    {collapsed
      ? <polyline points="13 9 16 12 13 15" />
      : <polyline points="16 9 13 12 16 15" />}
  </svg>
);

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
  const [collapsed, setCollapsed] = useState(false);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const savedTheme = window.localStorage?.getItem('alpha-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
    if (window.localStorage?.getItem('alpha-sidebar') === 'collapsed') setCollapsed(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { window.localStorage?.setItem('alpha-theme', theme); } catch {}
  }, [theme]);

  useEffect(() => {
    try { window.localStorage?.setItem('alpha-sidebar', collapsed ? 'collapsed' : 'open'); } catch {}
  }, [collapsed]);

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
  const logout = () => supabase.auth.signOut();

  return (
    <div className="app-shell">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="brand">
          <div className="brand-logo">α</div>
          {!collapsed && (
            <div>
              <h1>Alpha</h1>
              <div className="brand-sub">CONTENT LAUNCH</div>
            </div>
          )}
          <button
            className="icon-btn collapse-btn"
            title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
            onClick={() => { setCollapsed(!collapsed); setAccMenuOpen(false); }}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        </div>

        {!collapsed && (
          <>
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
          </>
        )}

        {navItems.map((n) => (
          <button
            key={n.key}
            className={`nav-item ${view === n.key ? 'active' : ''}`}
            title={collapsed ? n.label : undefined}
            onClick={() => setView(n.key)}
          >
            <NavIcon view={n.key} />
            {!collapsed && n.label}
          </button>
        ))}

        <div className="sidebar-footer">
          <button
            className={collapsed ? 'icon-btn footer-icon' : 'btn ghost theme-btn'}
            title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            {!collapsed && <span style={{ marginLeft: 8 }}>{theme === 'dark' ? 'Mode terang' : 'Mode gelap'}</span>}
          </button>
          {collapsed ? (
            <>
              <div className="user-avatar" title={`${displayName} · ${profile?.role || ''}`}>{initials(displayName)}</div>
              <button className="icon-btn footer-icon" title="Keluar" onClick={logout}><LogoutIcon /></button>
            </>
          ) : (
            <div className="user-chip">
              <div className="user-avatar">{initials(displayName)}</div>
              <div>
                <div className="u-name">{displayName}</div>
                <div className="u-role">{profile ? `${profile.role}${profile.team ? ' · ' + profile.team : ''}` : '…'}</div>
              </div>
              <button className="icon-btn" title="Keluar" onClick={logout}><LogoutIcon /></button>
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        {view === 'board' && <Board profile={profile} accounts={accounts} accountFilter={activeAccount} />}
        {view === 'kalender' && <CalendarView accounts={accounts} accountFilter={activeAccount} />}
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
        {view === 'laporan' && <ReportView accounts={accounts} accountFilter={activeAccount} />}
        {view === 'log' && canSeeLog && <LogView />}
        {view === 'access' && isSuper && <AccessView selfId={session.user.id} onAccountsChanged={loadAccounts} />}
      </main>
    </div>
  );
}
