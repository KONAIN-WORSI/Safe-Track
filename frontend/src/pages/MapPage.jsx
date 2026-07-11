import React, { useEffect, useRef, useState } from 'react';
import { useTrackerStore } from '../store';
import { formatTime, formatCoords, haversine } from '../utils/helpers';
import { useGeolocation } from '../hooks/useGeolocation';
import { getSocket } from '../hooks/useSocket';
import { api } from '../store';

const s = {
  heading: { fontSize: 22, fontWeight: 500, marginBottom: 4 },
  sub: { fontSize: 14, color: '#888', marginBottom: 16 },
  layout: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 560 },
  panel: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: 16 },
  userBtn: (sel) => ({ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: '0.5px solid', cursor: 'pointer', marginBottom: 6, background: sel ? '#E6F1FB' : '#fff', borderColor: sel ? '#185FA5' : 'rgba(0,0,0,0.12)', color: sel ? '#185FA5' : '#333' }),
  mapBox: { background: '#E6F1FB', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.1)', overflow: 'hidden', minHeight: 480, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 },
  startBtn: (on) => ({ padding: '9px 18px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer', background: on ? '#A32D2D' : '#185FA5', color: '#fff' }),
  badge: (safe) => ({ display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 500, background: safe ? '#EAF3DE' : '#FCEBEB', color: safe ? '#27500A' : '#791F1F' }),
};

export default function MapPage() {
  const { trackedUsers, fetchUsers, liveLocations, selectedUser, selectUser } = useTrackerStore();
  const [tracking, setTracking] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markers = useRef({});
  const circles = useRef({});
  const genericMarker = useRef(null);
  // SIM tracing disabled for production-ready builds
  // const [traceSim, setTraceSim] = useState('');
  // const [genericTraceLoc, setGenericTraceLoc] = useState(null);


  useEffect(() => { fetchUsers(); }, []);

  // Dynamically load Leaflet
  useEffect(() => {
    if (window.L) { setMapReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || leafletMap.current) return;
    const L = window.L;
    const map = L.map(mapRef.current).setView([27.7172, 85.3240], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    leafletMap.current = map;
  }, [mapReady]);

  // Plot safe zones on map
  useEffect(() => {
    const L = window.L;
    if (!L || !leafletMap.current) return;
    Object.values(circles.current).forEach(c => c.remove());
    circles.current = {};
    trackedUsers.forEach(u => {
      u.safeZones?.forEach(z => {
        const c = L.circle([z.lat, z.lng], {
          radius: z.radius, color: '#3B6D11', fillColor: '#EAF3DE', fillOpacity: 0.3, weight: 1.5, dashArray: '5,5'
        }).addTo(leafletMap.current).bindPopup(`Safe zone: ${z.name} (${z.radius}m)`);
        circles.current[`${u._id}_${z.name}`] = c;
      });
    });
  }, [trackedUsers, mapReady]);

  // Update live markers
  useEffect(() => {
    const L = window.L;
    if (!L || !leafletMap.current) return;
    Object.entries(liveLocations).forEach(([userId, data]) => {
      const { lat, lng } = data.location;
      const user = trackedUsers.find(u => u._id === userId);
      if (!user) return;

      const icon = L.divIcon({
        html: `<div style="background:${data.inSafeZone ? '#185FA5' : '#A32D2D'};color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${user.name[0]}</div>`,
        iconSize: [32, 32], iconAnchor: [16, 16]
      });
      if (markers.current[userId]) {
        markers.current[userId].setLatLng([lat, lng]).setIcon(icon)
          .bindPopup(`<b>${user.name}</b><br>${lat.toFixed(5)}, ${lng.toFixed(5)}<br>${data.inSafeZone ? '✅ In safe zone' : '⚠️ Outside safe zone'}`);
      } else {
        markers.current[userId] = L.marker([lat, lng], { icon })
          .addTo(leafletMap.current)
          .bindPopup(`<b>${user.name}</b>`);
      }
    });
  }, [liveLocations]);


  const { location, status } = useGeolocation({
    enabled: tracking && !!selectedUser,
    onPosition: async (loc) => {
      const socket = getSocket();
      if (socket && selectedUser) {
        socket.emit('location:ping', {
          trackedUserId: selectedUser._id,
          ...loc
        });
        try {
          await api.post(`/locations/${selectedUser._id}`, loc);
        } catch {}
      }
    }
  });

  useEffect(() => {
    if (!leafletMap.current || !selectedUser) return;
    const latest = liveLocations[selectedUser._id];
    if (!latest?.location) return;
    leafletMap.current.setView([latest.location.lat, latest.location.lng], 14);
  }, [selectedUser?._id, liveLocations[selectedUser?._id]?.location?.lat, liveLocations[selectedUser?._id]?.location?.lng]);

  const live = selectedUser ? liveLocations[selectedUser?._id] : null;

  return (
    <div>
      <div style={s.heading}>Live map</div>
      <div style={s.sub}>Real-time locations of all tracked users</div>

      <div style={s.layout}>
        <div style={s.panel}>
          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: '#5F5E5A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Users</div>
            {trackedUsers.length === 0 && <div style={{ fontSize: 13, color: '#aaa' }}>No tracked users</div>}
            {trackedUsers.map(u => (
              <button key={u._id} style={s.userBtn(selectedUser?._id === u._id)} onClick={() => selectUser(u)}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Age {u.age} · {u.isTracking ? '🟢 Live' : '⚫ Offline'}</div>
                {liveLocations[u._id] && (
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{formatCoords(liveLocations[u._id].location.lat, liveLocations[u._id].location.lng)}</div>
                )}
              </button>
            ))}
          </div>

          {selectedUser && (
            <div style={s.card}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: '#5F5E5A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Simulate device ({selectedUser.name})
              </div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.5 }}>
                In production this runs on the child's phone. Click below to simulate from this browser.
              </div>
              <button style={s.startBtn(tracking)} onClick={() => setTracking(t => !t)}>
                {tracking ? 'Stop tracking' : 'Start tracking'}
              </button>
              {location && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#5F5E5A', lineHeight: 1.8 }}>
                  <div>Lat: {location.lat.toFixed(6)}</div>
                  <div>Lng: {location.lng.toFixed(6)}</div>
                  <div>Accuracy: ±{location.accuracy} m</div>
                  {live && <div style={{ marginTop: 6 }}><span style={s.badge(live.inSafeZone)}>{live.inSafeZone ? `In zone: ${live.safeZoneName || 'unknown'}` : 'Outside safe zone!'}</span></div>}
                </div>
              )}
              {live && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#888', lineHeight: 1.6 }}>
                  <div>Latest live update: {formatTime(live.location?.timestamp)}</div>
                  <div>Status: {live.inSafeZone ? 'In safe zone' : 'Outside safe zone'}</div>
                </div>
              )}
              {status === 'error' && <div style={{ fontSize: 12, color: '#A32D2D', marginTop: 8 }}>Location permission denied</div>}
            </div>
          )}


        </div>

        <div ref={mapRef} style={{ borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.1)', overflow: 'hidden', minHeight: 480 }}>
          {!mapReady && <div style={{ ...s.mapBox, minHeight: 480 }}><div style={{ color: '#888', fontSize: 14 }}>Loading map...</div></div>}
        </div>
      </div>
    </div>
  );
}
