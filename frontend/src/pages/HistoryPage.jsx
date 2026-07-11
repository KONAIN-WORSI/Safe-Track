import React, { useEffect, useState } from 'react';
import { useTrackerStore, api } from '../store';
import { formatCoords, formatTime } from '../utils/helpers';

const s = {
  heading: { fontSize: 22, fontWeight: 500, marginBottom: 4 },
  sub: { fontSize: 14, color: '#888', marginBottom: 20 },
  controls: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, color: '#888' },
  select: { padding: '8px 12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, fontSize: 14, background: '#fff', outline: 'none' },
  input: { padding: '8px 12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, fontSize: 14, background: '#fff', outline: 'none' },
  btn: (v = 'primary') => ({ padding: '9px 18px', borderRadius: 8, border: '0.5px solid', fontSize: 14, cursor: 'pointer', fontWeight: 500, ...(v === 'primary' ? { background: '#185FA5', color: '#fff', borderColor: '#185FA5' } : { background: '#fff', color: '#333', borderColor: 'rgba(0,0,0,0.2)' }) }),
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.1)', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 },
  td: { padding: '11px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', verticalAlign: 'middle' },
  card: { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 10, overflow: 'hidden' },
  safeBadge: (safe) => ({ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 500, background: safe ? '#EAF3DE' : '#FCEBEB', color: safe ? '#27500A' : '#791F1F' }),
  empty: { textAlign: 'center', padding: '40px', color: '#888', fontSize: 14 },
};

export default function HistoryPage() {
  const { trackedUsers, fetchUsers, liveLocations } = useTrackerStore();
  const [selectedId, setSelectedId] = useState('');
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 16));

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { if (trackedUsers.length && !selectedId) setSelectedId(trackedUsers[0]._id); }, [trackedUsers]);

  const fetchHistory = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/locations/${selectedId}`, { params: { from, to, limit: 500 } });
      setLocations(data.locations);
    } catch { setLocations([]); } finally { setLoading(false); }
  };

  useEffect(() => { if (selectedId) fetchHistory(); }, [selectedId, liveLocations[selectedId]]);

  const exportCSV = () => {
    const user = trackedUsers.find(u => u._id === selectedId);
    window.open(`/api/locations/${selectedId}/export/csv`, '_blank');
  };

  const exportJSON = () => {
    const user = trackedUsers.find(u => u._id === selectedId);
    const blob = new Blob([JSON.stringify({ user: user?.name, locations }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `history_${user?.name || 'user'}_${Date.now()}.json`; a.click();
  };

  return (
    <div>
      <div style={s.heading}>Location history</div>
      <div style={s.sub}>Browse and export past location data</div>

      <div style={s.controls}>
        <div style={s.field}>
          <label style={s.label}>Tracked user</label>
          <select style={s.select} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            {trackedUsers.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        <div style={s.field}>
          <label style={s.label}>From</label>
          <input type="datetime-local" style={s.input} value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div style={s.field}>
          <label style={s.label}>To</label>
          <input type="datetime-local" style={s.input} value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button style={s.btn()} onClick={fetchHistory} disabled={loading}>Search</button>
        <button style={s.btn('secondary')} onClick={exportCSV}>Export CSV</button>
        <button style={s.btn('secondary')} onClick={exportJSON}>Export JSON</button>
      </div>

      <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
        {loading ? 'Loading...' : `${locations.length} records found`}
      </div>

      {liveLocations[selectedId] && (
        <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Latest live point</div>
          <div style={{ fontSize: 13, color: '#5F5E5A' }}>
            {formatCoords(liveLocations[selectedId].location.lat, liveLocations[selectedId].location.lng)} · {formatTime(liveLocations[selectedId].location.timestamp)}
          </div>
        </div>
      )}

      <div style={s.card}>
        {locations.length === 0 && !loading && <div style={s.empty}>No location records found for the selected period</div>}
        {locations.length > 0 && (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>Coordinates</th>
                <th style={s.th}>Accuracy</th>
                <th style={s.th}>Speed</th>
                <th style={s.th}>Zone</th>
                <th style={s.th}>Time</th>
                <th style={s.th}>Map</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((l, i) => (
                <tr key={l._id} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                  <td style={{ ...s.td, color: '#aaa', width: 40 }}>{i + 1}</td>
                  <td style={s.td}><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{formatCoords(l.lat, l.lng)}</span></td>
                  <td style={s.td}>{l.accuracy != null ? `±${l.accuracy}m` : '—'}</td>
                  <td style={s.td}>{l.speed != null ? `${(l.speed * 3.6).toFixed(1)} km/h` : '—'}</td>
                  <td style={s.td}><span style={s.safeBadge(l.inSafeZone)}>{l.inSafeZone ? (l.safeZoneName || 'Safe') : 'Outside'}</span></td>
                  <td style={s.td}>{formatTime(l.timestamp)}</td>
                  <td style={s.td}>
                    <a href={`https://www.google.com/maps?q=${l.lat},${l.lng}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#185FA5' }}>View →</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
