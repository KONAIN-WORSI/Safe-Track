import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, useAuthStore } from '../store';
import { queueLocation, getQueuedLocations, getQueueCount, clearQueue, removeOldest } from '../utils/locationQueue';

export function useLiveLocationTracker() {
  const token = useAuthStore(s => s.token);
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const trackedUserIdRef = useRef(null);
  const trackingTokenRef = useRef(null);
  const isOnlineRef = useRef(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('idle');
  const [queueCount, setQueueCount] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Update online status
  useEffect(() => {
    const goOnline = () => { isOnlineRef.current = true; setIsOnline(true); };
    const goOffline = () => { isOnlineRef.current = false; setIsOnline(false); };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const updateQueueCount = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setQueueCount(count);
    } catch {}
  }, []);

  const replayQueue = useCallback(async (socket) => {
    if (!socket?.connected) return;
    try {
      const queued = await getQueuedLocations();
      if (queued.length === 0) return;

      setStatus('syncing');
      let sent = 0;

      for (const ping of queued) {
        if (!socket.connected) break;
        const payload = {
          trackedUserId: ping.trackedUserId,
          lat: ping.lat,
          lng: ping.lng,
          accuracy: ping.accuracy,
          speed: ping.speed,
          heading: ping.heading,
          altitude: ping.altitude,
          timestamp: ping.timestamp || ping.queuedAt
        };
        socket.emit('location:ping', payload);
        sent++;
        // Small delay between replays to avoid flooding
        await new Promise(r => setTimeout(r, 50));
      }

      // Remove successfully sent pings from queue
      if (sent > 0) {
        await removeOldest(sent);
      }
      await updateQueueCount();
      setStatus('tracking');
    } catch (err) {
      console.error('Queue replay failed:', err);
    }
  }, [updateQueueCount]);

  const sendPing = useCallback(async (socket, payload) => {
    if (socket?.connected) {
      socket.emit('location:ping', payload);
      setStatus('tracking');
    } else {
      // Store in IndexedDB for offline replay
      try {
        await queueLocation(payload);
        await updateQueueCount();
        setStatus('offline-queueing');
      } catch (err) {
        console.error('Failed to queue location:', err);
      }
    }
  }, [updateQueueCount]);

  const startGeolocation = useCallback((trackedUserId, socket) => {
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
          altitude: position.coords.altitude,
          timestamp: new Date().toISOString()
        };
        sendPing(socket, payload);
      },
      (error) => {
        console.error('Geolocation error', error);
        setStatus('error');
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  }, [sendPing]);

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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('st_device_token');
    }
    setIsActive(false);
    setStatus('stopped');
    setQueueCount(0);
  }, []);

  useEffect(() => {
    return () => { stopTracking(); };
  }, [stopTracking]);

  const startTracking = useCallback(async (trackedUserId, providedToken = null) => {
    let trackingToken = providedToken;
    if (!trackingToken && typeof window !== 'undefined') {
      trackingToken = localStorage.getItem('st_device_token');
    }

    if (!trackedUserId && !trackingToken) return false;

    // Call internal cleanup but do not clear localStorage if we are restoring
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    watchIdRef.current = null;
    trackedUserIdRef.current = trackedUserId;
    trackingTokenRef.current = trackingToken;
    setIsActive(true);
    setStatus('requesting-token');

    try {
      if (!trackingToken) {
        const { data } = await api.post(`/auth/tracking-token/${trackedUserId}`);
        trackingToken = data.token;
      }

      if (typeof window !== 'undefined' && trackingToken) {
        localStorage.setItem('st_device_token', trackingToken);
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

      socket.on('connect', async () => {
        console.log('Socket connected');
        setStatus('connected');
        // Replay any queued offline pings
        await replayQueue(socket);
        // Start geolocation after replay
        startGeolocation(trackedUserId, socket);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setStatus('disconnected');
      });

      socket.on('reconnect_attempt', (attempt) => {
        console.log('Socket reconnecting attempt:', attempt);
        setStatus('reconnecting');
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

      // If already offline, start geolocation immediately (will queue pings)
      if (!navigator.onLine) {
        startGeolocation(trackedUserId, socket);
      }

      await updateQueueCount();
      return true;
    } catch (error) {
      console.error('Tracking token request failed', error);
      stopTracking();
      setStatus('error');
      return false;
    }
  }, [stopTracking, startGeolocation, replayQueue, updateQueueCount]);

  return { isActive, status, startTracking, stopTracking, queueCount, isOnline };
}
