import React, { useState } from 'react';
import { useAuthStore, api } from '../store';

const s = {
  heading: { fontSize: 22, fontWeight: 500, marginBottom: 4 },
  sub: { fontSize: 14, color: '#888', marginBottom: 24 },
  section: { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '20px 24px', marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 500, marginBottom: 16, paddingBottom: 12, borderBottom: '0.5px solid rgba(0,0,0,0.08)' },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: '#5F5E5A', marginBottom: 5 },
  input: { width: '100%', maxWidth: 400, padding: '9px 12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, fontSize: 14, outline: 'none' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid rgba(0,0,0,0.06)', maxWidth: 500 },
  toggle: (on) => ({ width: 40, height: 22, borderRadius: 11, background: on ? '#185FA5' : '#ccc', cursor: 'pointer', position: 'relative', border: 'none', transition: 'background 0.2s', flexShrink: 0 }),
  toggleDot: (on) => ({ position: 'absolute', top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }),
  btn: { padding: '9px 20px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  success: { color: '#3B6D11', fontSize: 13, marginTop: 10 },
};

export default function SettingsPage() {
  const { user, fetchMe } = useAuthStore();
  const [prefs, setPrefs] = useState(user?.alertPreferences || { email: true, sms: false, push: true });
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });

  const togglePref = (k) => setPrefs(p => ({ ...p, [k]: !p[k] }));

  const savePrefs = async () => {
    try {
      await api.patch('/auth/me', { alertPreferences: prefs });
      await fetchMe(); setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
  };

  const saveProfile = async () => {
    try {
      await api.patch('/auth/me', profile);
      await fetchMe(); setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
  };

  const Toggle = ({ on, onToggle }) => (
    <button style={s.toggle(on)} onClick={onToggle}>
      <div style={s.toggleDot(on)} />
    </button>
  );

  return (
    <div>
      <div style={s.heading}>Settings</div>
      <div style={s.sub}>Account and notification preferences</div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Profile</div>
        <div style={s.field}>
          <label style={s.label}>Full name</label>
          <input style={s.input} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input style={{ ...s.input, opacity: 0.6 }} value={user?.email || ''} disabled />
        </div>
        <div style={s.field}>
          <label style={s.label}>Phone (for SMS alerts)</label>
          <input style={s.input} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+977-98XXXXXXXX" />
        </div>
        <button style={s.btn} onClick={saveProfile}>Save profile</button>
        {saved && <div style={s.success}>Saved successfully</div>}
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Alert notifications</div>
        {[
          { key: 'email', label: 'Email alerts', desc: 'Receive alerts via email when a child leaves the safe zone' },
          { key: 'sms', label: 'SMS alerts (requires Twilio)', desc: 'Receive text messages for critical alerts' },
          { key: 'push', label: 'Browser push notifications', desc: 'Show browser notifications for real-time alerts' },
        ].map(({ key, label, desc }) => (
          <div key={key} style={s.row}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{desc}</div>
            </div>
            <Toggle on={prefs[key]} onToggle={() => togglePref(key)} />
          </div>
        ))}
        <button style={{ ...s.btn, marginTop: 16 }} onClick={savePrefs}>Save preferences</button>
        {saved && <div style={s.success}>Preferences saved</div>}
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Data & privacy</div>
        <div style={{ fontSize: 14, color: '#5F5E5A', lineHeight: 1.7, maxWidth: 520 }}>
          Location data is stored for 30 days then automatically deleted. Only the registered guardian can view tracked user data. All transmissions are encrypted via HTTPS/WSS. Consent must be explicitly granted before any tracking begins.
        </div>
      </div>
    </div>
  );
}
