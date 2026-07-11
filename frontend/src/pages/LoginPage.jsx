import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f6f2', padding: 16 },
  card: { background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', padding: '36px 32px', width: '100%', maxWidth: 400 },
  logo: { fontSize: 22, fontWeight: 600, color: '#185FA5', marginBottom: 6 },
  sub: { fontSize: 14, color: '#888', marginBottom: 28 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: '#5F5E5A', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' },
  btn: { width: '100%', padding: '10px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, marginTop: 8, cursor: 'pointer' },
  error: { background: '#FCEBEB', color: '#A32D2D', padding: '9px 12px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  link: { textAlign: 'center', marginTop: 18, fontSize: 13, color: '#888' }
};

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(form.email, form.password);
    if (ok) navigate('/dashboard');
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>SafeTrack</div>
        <div style={s.sub}>Sign in to your guardian account</div>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="guardian@email.com" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="••••••••" />
          </div>
          <button style={s.btn} type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <div style={s.link}>No account? <Link to="/register">Register here</Link></div>
      </div>
    </div>
  );
}
