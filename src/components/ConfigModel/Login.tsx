import React, { useState } from 'react';
import { supabase } from '../../core/supabaseClient';

export function Login({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
    } else {
      onLoginSuccess();
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f3f4f6', color: '#1f2937' }}>
      <form onSubmit={handleSubmit} style={{ background: '#ffffff', padding: 30, borderRadius: 8, width: 350, display: 'flex', flexDirection: 'column', gap: 15, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>Đăng Nhập Quản Trị</h2>
        {error && <p style={{ color: '#ef4444', fontSize: 14, margin: 0 }}>{error}</p>}
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 10, marginTop: 5, borderRadius: 4, border: '1px solid #d1d5db', background: '#f9fafb', color: '#1f2937' }}
          />
        </div>
        <div>
          <label>Mật khẩu:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 10, marginTop: 5, borderRadius: 4, border: '1px solid #d1d5db', background: '#f9fafb', color: '#1f2937' }}
          />
        </div>
        <button type="submit" disabled={loading} style={{ padding: 12, marginTop: 10, background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, cursor: loading ? 'wait' : 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
        </button>
      </form>
    </div>
  );
}
