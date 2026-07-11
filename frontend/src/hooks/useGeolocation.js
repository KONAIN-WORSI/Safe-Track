import { useState, useEffect, useRef } from 'react';

export function useGeolocation({ onPosition, onError, interval = 5000, enabled = false } = {}) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | requesting | active | error
  const watchRef = useRef(null);

  const start = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setStatus('error');
      return;
    }
    setStatus('requesting');
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          altitude: pos.coords.altitude,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          timestamp: new Date(pos.timestamp)
        };
        setLocation(loc);
        setStatus('active');
        setError(null);
        onPosition && onPosition(loc);
      },
      (err) => {
        const msg = err.code === 1 ? 'Permission denied' : err.code === 2 ? 'Position unavailable' : 'Timeout';
        setError(msg);
        setStatus('error');
        onError && onError(msg);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
  };

  const stop = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setStatus('idle');
  };

  useEffect(() => {
    if (enabled) start();
    else stop();
    return stop;
  }, [enabled]);

  return { location, error, status, start, stop };
}
