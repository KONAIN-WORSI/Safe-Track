import React, { useEffect, useMemo } from 'react';
import { useLiveLocationTracker } from '../hooks/useLiveLocationTracker';

const s = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f5f8fc' },
  card: { background: '#fff', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 480, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' },
  title: { fontSize: 22, fontWeight: 600, marginBottom: 8 },
  body: { fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 16 },
  btn: (active) => ({ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', background: active ? '#A32D2D' : '#185FA5', color: '#fff' }),
  status: { marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#f4f7fb', color: '#36506b', fontSize: 13 },
  offlineBar: { marginTop: 8, padding: '8px 12px', borderRadius: 8, background: '#FAEEDA', color: '#854F0B', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 },
  onlineBar: { marginTop: 8, padding: '8px 12px', borderRadius: 8, background: '#EAF3DE', color: '#27500A', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 },
  dot: (on) => ({ width: 8, height: 8, borderRadius: '50%', background: on ? '#3B6D11' : '#A32D2D', flexShrink: 0 }),
};

export default function TrackingDevicePage() {
  const [token, setToken] = React.useState('');
  const [permissionError, setPermissionError] = React.useState('');
  const { isActive, status, startTracking, stopTracking, queueCount, isOnline } = useLiveLocationTracker();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const trackingToken = params.get('token');
    if (trackingToken) {
      setToken(trackingToken);
      const requestLocation = async () => {
        if (!navigator.geolocation) {
          setPermissionError('Geolocation is not supported on this device.');
          return;
        }

        try {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 20000 });
          });
          await startTracking(null, trackingToken);
        } catch (error) {
          setPermissionError('Location permission was denied or unavailable.');
        }
      };

      requestLocation();
    }
  }, []);

  useEffect(() => () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const statusLabel = useMemo(() => {
    if (permissionError) return permissionError;
    if (!token) return 'No tracking link was provided.';
    if (status === 'tracking') return 'Your location is being shared live.';
    if (status === 'connected') return 'Connected to SafeTrack. Waiting for GPS updates.';
    if (status === 'disconnected') return 'Connection lost. Attempting to reconnect...';
    if (status === 'reconnecting') return 'Reconnecting to SafeTrack...';
    if (status === 'syncing') return `Syncing ${queueCount} stored location${queueCount !== 1 ? 's' : ''}...`;
    if (status === 'offline-queueing') return 'Offline — locations are being stored locally.';
    if (status === 'requesting-token') return 'Preparing secure location sharing...';
    if (status === 'error') return 'Location sharing could not start. Please allow location access.';
    return 'Ready to share your location.';
  }, [permissionError, status, token, queueCount]);

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.title}>Share your location</div>
        <div style={s.body}>
          Open this page on the child's phone to send the real GPS location to the guardian dashboard. Works even without internet — locations are stored locally and sent when connection returns.
        </div>

        <button style={s.btn(isActive)} onClick={() => (isActive ? stopTracking() : startTracking(null, token))}>
          {isActive ? 'Stop sharing location' : 'Start sharing location'}
        </button>

        <div style={s.status}>{statusLabel}</div>

        {isActive && (
          <div style={isOnline ? s.onlineBar : s.offlineBar}>
            <div style={s.dot(isOnline)} />
            <div>
              {isOnline ? 'Online' : 'Offline'}
              {queueCount > 0 && ` — ${queueCount} location${queueCount !== 1 ? 's' : ''} queued for sync`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
