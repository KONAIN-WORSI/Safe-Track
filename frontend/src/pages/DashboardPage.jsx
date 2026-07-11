import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore, useTrackerStore } from '../store';
import { formatTime, formatCoords } from '../utils/helpers';

const s = {
  heading: { fontSize: 22, fontWeight: 500, marginBottom: 4 },
  sub: { fontSize: 14, color: '#888', marginBottom: 24 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 },
  stat: { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '16px 18px' },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  statVal: { fontSize: 26, fontWeight: 500 },
  section: { marginBottom: 24 },
  sectionHead: { fontSize: 15, fontWeight: 500, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  card: { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 10 },
  userRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' },
  avatar: { width: 40, height: 40, borderRadius: '50%', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 500, color: '#185FA5', flexShrink: 0 },
  dot: (online) => ({ width: 8, height: 8, borderRadius: '50%', background: online ? '#639922' : '#B4B2A9', flexShrink: 0 }),
  badge: (safe) => ({ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 500, background: safe ? '#EAF3DE' : '#FCEBEB', color: safe ? '#27500A' : '#791F1F' }),
  empty: { textAlign: 'center', padding: '32px 16px', color: '#888', fontSize: 14 },
  alertRow: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' },
  alertIcon: (sev) => ({ fontSize: 18, flexShrink: 0, marginTop: 1 }),
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { trackedUsers, alerts, fetchUsers, fetchAlerts } = useTrackerStore();

  useEffect(() => { fetchUsers(); fetchAlerts({ limit: 5 }); }, []);

  const active = trackedUsers.filter(u => u.isTracking).length;
  const safe = trackedUsers.filter(u => u.inSafeZone !== false).length;
  const unread = alerts.filter(a => !a.acknowledged).length;

  return (
    <div>
      <div style={s.heading}>Welcome back, {user?.name?.split(' ')[0]}</div>
      <div style={s.sub}>Real-time overview of all tracked users</div>

      <div style={s.grid}>
        {[
          { label: 'Tracked users', val: trackedUsers.length, color: '#185FA5' },
          { label: 'Currently active', val: active, color: '#3B6D11' },
          { label: 'In safe zone', val: safe, color: '#3B6D11' },
          { label: 'Unread alerts', val: unread, color: unread > 0 ? '#A32D2D' : '#5F5E5A' },
        ].map(({ label, val, color }) => (
          <div key={label} style={s.stat}>
            <div style={s.statLabel}>{label}</div>
            <div style={{ ...s.statVal, color }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={s.section}>
          <div style={s.sectionHead}>
            Tracked users
            <Link to="/tracked-users" style={{ fontSize: 13, color: '#185FA5' }}>Manage →</Link>
          </div>
          <div style={s.card}>
            {trackedUsers.length === 0
              ? <div style={s.empty}>No users yet. <Link to="/tracked-users">Add one →</Link></div>
              : trackedUsers.slice(0, 5).map(u => (
                <div key={u._id} style={s.userRow}>
                  <div style={s.avatar}>{u.name[0].toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      {u.lastLocation ? formatCoords(u.lastLocation.lat, u.lastLocation.lng) : 'No location yet'}
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>
                      {u.lastLocation ? formatTime(u.lastLocation.timestamp) : ''}
                    </div>
                  </div>
                  <div style={s.dot(u.isTracking)} />
                  <span style={s.badge(u.inSafeZone !== false)}>{u.inSafeZone !== false ? 'Safe' : 'Alert'}</span>
                </div>
              ))
            }
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionHead}>
            Recent alerts
            <Link to="/alerts" style={{ fontSize: 13, color: '#185FA5' }}>All alerts →</Link>
          </div>
          <div style={s.card}>
            {alerts.length === 0
              ? <div style={s.empty}>No alerts — all clear</div>
              : alerts.slice(0, 5).map(a => (
                <div key={a._id} style={{ ...s.alertRow, opacity: a.acknowledged ? 0.5 : 1 }}>
                  <div style={s.alertIcon(a.severity)}>{a.type === 'sos' ? '🆘' : a.type === 'zone_exit' ? '⚠️' : '🔔'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: a.acknowledged ? 400 : 500 }}>{a.message}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{formatTime(a.createdAt)}</div>
                  </div>
                  {!a.acknowledged && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#A32D2D', flexShrink: 0, marginTop: 4 }} />}
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
