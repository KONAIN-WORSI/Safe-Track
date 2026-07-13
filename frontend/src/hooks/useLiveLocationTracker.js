import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, useAuthStore } from '../store';

export function useLiveLocationTracker() {
  const token = useAuthStore(s => s.token);
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const trackedUserIdRef = useRef(null);
  const trackingTokenRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('idle');

  const startGeolocation = useCallback((trackedUserId) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

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
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    watchIdRef.current = null;
    trackedUserIdRef.current = null;
    trackingTokenRef.current = null;
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
    trackingTokenRef.current = providedToken;
    setIsActive(true);
    setStatus('requesting-token');

    try {
      let trackingToken = providedToken;
      if (!trackingToken) {
        const { data } = await api.post(`/auth/tracking-token/${trackedUserId}`);
        trackingToken = data.token;
      }

      const socketUrl = import.meta.env.VITE_API_URL || 'https://safe-track-jaf5.onrender.com';
      const socket = io(socketUrl, {
        auth: { token: trackingToken },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Socket connected');
        setStatus('connected');
        startGeolocation(trackedUserId);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setStatus('disconnected');
      });

      socket.on('reconnect_attempt', (attempt) => {
        console.log('Socket reconnecting attempt:', attempt);
        setStatus('reconnecting');
      });

      socket.on('reconnect', () => {
        console.log('Socket reconnected');
        setStatus('connected');
        startGeolocation(trackedUserId);
      });

      socket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed');
        setStatus('error');
      });

      socket.on('connect_error', (err) => {
        console.error('Socket tracking error', err.message);
        if (socket.active) {
          setStatus('reconnecting');
        } else {
          setStatus('error');
        }
      });

      return true;
    } catch (error) {
      console.error('Tracking token request failed', error);
      stopTracking();
      setStatus('error');
      return false;
    }
  }, [stopTracking, startGeolocation]);

  return { isActive, status, startTracking, stopTracking };
}
