import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore, useTrackerStore } from '../store';

let socketInstance = null;

export function useSocket() {
  const token = useAuthStore(s => s.token);
  const updateLiveLocation = useTrackerStore(s => s.updateLiveLocation);
  const pushAlert = useTrackerStore(s => s.pushAlert);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const socketUrl = import.meta.env.VITE_API_URL || 'https://safe-track-jaf5.onrender.com';
    const socket = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketRef.current = socket;
    socketInstance = socket;

    socket.on('connect', () => console.log('Socket connected'));
    socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason));
    socket.on('reconnect', () => console.log('Socket reconnected'));

    socket.on('location:update', (data) => {
      updateLiveLocation(data.trackedUserId, data);
    });

    socket.on('alert:new', (alert) => {
      pushAlert(alert);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('SafeTrack Alert', {
          body: alert.message,
          icon: '/favicon.ico'
        });
      }
    });

    socket.on('alert:sos', (alert) => {
      pushAlert({ ...alert, severity: 'critical' });
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('SOS ALERT', { body: alert.message });
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketInstance = null;
    };
  }, [token]);

  return socketRef;
}

export function getSocket() { return socketInstance; }
