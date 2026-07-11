import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f6f2', padding: 16 },
  card: { background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', padding: '36px 32px', width: '100%', maxWidth: 440 },
  logo: { fontSize: 22, fontWeight: 600, color: '#185FA5', marginBottom: 6 },
  sub: { fontSize: 14, color: '#888', marginBottom: 28 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: '#5F5E5A', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, fontSize: 14, outline: 'none' },
  btn: { width: '100%', padding: '10px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, marginTop: 8, cursor: 'pointer' },
  error: { background: '#FCEBEB', color: '#A32D2D', padding: '9px 12px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  link: { textAlign: 'center', marginTop: 18, fontSize: 13, color: '#888' }
};

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const { register, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await register(form);
    if (ok) navigate('/dashboard');
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>SafeTrack</div>
        <div style={s.sub}>Create a guardian account</div>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Full name</label>
              <input style={s.input} value={form.name} onChange={set('name')} required placeholder="Your name" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Phone (optional)</label>
              <input style={s.input} value={form.phone} onChange={set('phone')} placeholder="+977-98XXXXXXXX" />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={form.email} onChange={set('email')} required placeholder="you@email.com" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password (min 8 characters)</label>
            <input style={s.input} type="password" value={form.password} onChange={set('password')} required minLength={8} placeholder="••••••••" />
          </div>
          <button style={s.btn} type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
        </form>
        <div style={s.link}>Already registered? <Link to="/login">Sign in</Link></div>
      </div>
    </div>
  );
}
