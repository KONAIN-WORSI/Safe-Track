import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, useAuthStore } from '../store';

export function useLiveLocationTracker() {
  const token = useAuthStore(s => s.token);
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const trackedUserIdRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('idle');

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    watchIdRef.current = null;
    trackedUserIdRef.current = null;
    setIsActive(false);
    setStatus('stopped');
  }, []);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  const startTracking = useCallback(async (trackedUserId, providedToken = null) => {
    if (!trackedUserId && !providedToken) return false;

    stopTracking();
    trackedUserIdRef.current = trackedUserId;
    setIsActive(true);
    setStatus('requesting-token');

    try {
      let trackingToken = providedToken;
      if (!trackingToken) {
        const { data } = await api.post(`/auth/tracking-token/${trackedUserId}`);
        trackingToken = data.token;
      }

      const socketUrl = import.meta.env.VITE_API_URL || 'https://safe-track-jaf5.onrender.com';
      socketRef.current = io(socketUrl, {
        auth: { token: trackingToken }
      });

      socketRef.current.on('connect', () => setStatus('connected'));
      socketRef.current.on('connect_error', (err) => {
        console.error('Socket tracking error', err);
        setStatus('error');
      });

      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const payload = {
              trackedUserId: trackedUserId || trackedUserIdRef.current,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed,
              heading: position.coords.heading,
              altitude: position.coords.altitude
            };

            if (socketRef.current?.connected) {
              socketRef.current.emit('location:ping', payload);
              setStatus('tracking');
            }
          },
          (error) => {
            console.error('Geolocation error', error);
            setStatus('error');
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
        );
      }

      return true;
    } catch (error) {
      console.error('Tracking token request failed', error);
      stopTracking();
      setStatus('error');
      return false;
    }
  }, [stopTracking, token]);

  return { isActive, status, startTracking, stopTracking };
}
