import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, useTrackerStore } from '../store';

const NAV = [
  { to: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { to: '/tracked-users', icon: '👤', label: 'Tracked users' },
  { to: '/map', icon: '🗺', label: 'Live map' },
  { to: '/alerts', icon: '🔔', label: 'Alerts' },
  { to: '/history', icon: '📍', label: 'History' },
  { to: '/settings', icon: '⚙', label: 'Settings' },
];

const s = {
  shell: { display: 'flex', minHeight: '100vh' },
  sidebar: { width: 220, background: '#fff', borderRight: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  logo: { padding: '20px 20px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.08)' },
  logoText: { fontSize: 18, fontWeight: 600, color: '#185FA5' },
  logoSub: { fontSize: 11, color: '#888', marginTop: 2 },
  nav: { flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 },
  navLink: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, fontSize: 14, color: '#5F5E5A', textDecoration: 'none', transition: 'all 0.15s' },
  navActive: { background: '#E6F1FB', color: '#185FA5', fontWeight: 500 },
  badge: { marginLeft: 'auto', background: '#A32D2D', color: '#FCEBEB', fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 10 },
  footer: { padding: '12px 16px', borderTop: '0.5px solid rgba(0,0,0,0.08)' },
  userRow: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: '#185FA5', flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  logoutBtn: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, padding: '4px 0' },
  main: { flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' },
  topbar: { background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.08)', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flexShrink: 0 },
  content: { flex: 1, padding: 24, maxWidth: 1200, width: '100%', margin: '0 auto' }
};

export default function Layout() {
  const { user, logout } = useAuthStore();
  const unreadAlerts = useTrackerStore(st => st.unreadAlerts);
  const navigate = useNavigate();

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'G';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.logo}>
          <div style={s.logoText}>SafeTrack</div>
          <div style={s.logoSub}>Child safety system</div>
        </div>
        <nav style={s.nav}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({ ...s.navLink, ...(isActive ? s.navActive : {}) })}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{icon}</span>
              {label}
              {label === 'Alerts' && unreadAlerts > 0 && (
                <span style={s.badge}>{unreadAlerts}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div style={s.footer}>
          <div style={s.userRow}>
            <div style={s.avatar}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.userName}>{user?.name}</div>
              <button style={s.logoutBtn} onClick={handleLogout}>Sign out</button>
            </div>
          </div>
        </div>
      </aside>

      <main style={s.main}>
        <div style={s.topbar}>
          <span style={{ fontSize: 13, color: '#888' }}>Guardian portal</span>
        </div>
        <div style={s.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
