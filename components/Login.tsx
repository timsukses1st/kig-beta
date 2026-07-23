'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError('Email atau password salah. Coba lagi.');
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Beta</h1>
        <p className="sub">Content Launch System — internal KIG</p>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@kig.co.id"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <button className="btn primary" style={{ width: '100%' }} onClick={submit} disabled={loading || !email || !password}>
          {loading ? 'Masuk…' : 'Masuk'}
        </button>
        {error && <p className="error-msg">{error}</p>}
      </div>
    </div>
  );
}
