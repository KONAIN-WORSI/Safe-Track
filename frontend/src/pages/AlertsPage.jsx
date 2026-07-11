import React, { useEffect } from 'react';
import { useTrackerStore } from '../store';
import { formatTime, alertIcon, severityColor } from '../utils/helpers';

const s = {
  heading: { fontSize: 22, fontWeight: 500, marginBottom: 4 },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 20 },
  card: { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 10, overflow: 'hidden' },
  row: (sev, ack) => ({
    display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px',
    borderBottom: '0.5px solid rgba(0,0,0,0.06)',
    background: ack ? 'transparent' : sev === 'critical' ? '#FCEBEB' : sev === 'warning' ? '#FAEEDA' : '#fff',
    opacity: ack ? 0.6 : 1
  }),
  icon: { fontSize: 20, flexShrink: 0, marginTop: 1 },
  msg: (ack) => ({ fontWeight: ack ? 400 : 500, fontSize: 14, color: '#1a1a1a' }),
  meta: { fontSize: 12, color: '#888', marginTop: 3 },
  ackBtn: { marginLeft: 'auto', padding: '5px 12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', flexShrink: 0 },
  allBtn: { padding: '7px 16px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' },
  empty: { textAlign: 'center', padding: '48px 0', color: '#888' },
  filter: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterBtn: (active) => ({ padding: '5px 14px', borderRadius: 20, border: '0.5px solid', fontSize: 13, cursor: 'pointer', background: active ? '#185FA5' : '#fff', color: active ? '#fff' : '#333', borderColor: active ? '#185FA5' : 'rgba(0,0,0,0.2)' }),
};

export default function AlertsPage() {
  const { alerts, fetchAlerts, acknowledgeAlert, acknowledgeAll, unreadAlerts } = useTrackerStore();
  const [filter, setFilter] = React.useState('all');

  useEffect(() => { fetchAlerts({ limit: 100 }); }, []);

  const filtered = filter === 'all' ? alerts
    : filter === 'unread' ? alerts.filter(a => !a.acknowledged)
    : alerts.filter(a => a.type === filter);

  return (
    <div>
      <div style={s.heading}>Alerts</div>
      <div style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>
        {unreadAlerts} unread alert{unreadAlerts !== 1 ? 's' : ''}
      </div>

      <div style={s.filter}>
        {['all', 'unread', 'zone_exit', 'sos', 'signal_lost'].map(f => (
          <button key={f} style={s.filterBtn(filter === f)} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div style={s.topRow}>
        <div style={{ fontSize: 14, color: '#888' }}>{filtered.length} alert{filtered.length !== 1 ? 's' : ''}</div>
        {unreadAlerts > 0 && <button style={s.allBtn} onClick={acknowledgeAll}>Mark all as read</button>}
      </div>

      <div style={s.card}>
        {filtered.length === 0 && <div style={s.empty}><div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>No alerts</div>}
        {filtered.map(a => (
          <div key={a._id} style={s.row(a.severity, a.acknowledged)}>
            <div style={s.icon}>{alertIcon(a.type)}</div>
            <div style={{ flex: 1 }}>
              <div style={s.msg(a.acknowledged)}>{a.message}</div>
              <div style={s.meta}>
                {a.trackedUser?.name && <span style={{ fontWeight: 500 }}>{a.trackedUser.name} · </span>}
                {a.type.replace('_', ' ')} · {formatTime(a.createdAt)}
                {a.location?.lat && <span> · {a.location.lat.toFixed(4)}, {a.location.lng.toFixed(4)}</span>}
              </div>
            </div>
            {!a.acknowledged && (
              <button style={s.ackBtn} onClick={() => acknowledgeAlert(a._id)}>Dismiss</button>
            )}
            {!a.acknowledged && (
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: severityColor(a.severity), flexShrink: 0, alignSelf: 'center' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
