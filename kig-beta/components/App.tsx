'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import Login from '@/components/Login';
import Board from '@/components/Board';
import LogView from '@/components/LogView';
import AccessView from '@/components/AccessView';

type View = 'board' | 'log' | 'access';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<View>('board');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const saved = window.localStorage?.getItem('beta-theme');
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage?.setItem('beta-theme', theme);
    } catch {}
  }, [theme]);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile((data as Profile) || null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      setBooting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  if (booting) return null;
  if (!session) return <Login />;

  const isSuper = profile?.role === 'superadmin';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <h1>Beta</h1>
          <span>Content Launch System</span>
        </div>
        <button className={`nav-item ${view === 'board' ? 'active' : ''}`} onClick={() => setView('board')}>
          ▦ Board
        </button>
        <button className={`nav-item ${view === 'log' ? 'active' : ''}`} onClick={() => setView('log')}>
          ≡ Log Aktivitas
        </button>
        {isSuper && (
          <button className={`nav-item ${view === 'access' ? 'active' : ''}`} onClick={() => setView('access')}>
            ⚙ Kelola Akses
          </button>
        )}
        <div className="sidebar-footer">
          <div className="user-chip">
            <b>{profile?.full_name || session.user.email}</b>
            {profile ? `${profile.role}${profile.team ? ' · ' + profile.team : ''}` : 'memuat profil…'}
          </div>
          <button className="btn ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀ Mode terang' : '☾ Mode gelap'}
          </button>
          <button className="btn ghost" onClick={() => supabase.auth.signOut()}>
            ← Keluar
          </button>
        </div>
      </aside>
      <main className="main">
        {view === 'board' && <Board profile={profile} />}
        {view === 'log' && <LogView />}
        {view === 'access' && isSuper && <AccessView selfId={session.user.id} />}
      </main>
    </div>
  );
}
