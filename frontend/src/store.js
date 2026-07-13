import { create } from 'zustand';
import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://safe-track-jaf5.onrender.com';
const api = axios.create({ baseURL: `${apiBaseUrl}/api` });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('st_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('st_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export { api };

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('st_token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('st_token', data.token);
      set({ user: data.user, token: data.token, loading: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Login failed', loading: false });
      return false;
    }
  },

  register: async (form) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/register', form);
      localStorage.setItem('st_token', data.token);
      set({ user: data.user, token: data.token, loading: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Registration failed', loading: false });
      return false;
    }
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user });
    } catch { localStorage.removeItem('st_token'); set({ user: null, token: null }); }
  },

  logout: () => {
    localStorage.removeItem('st_token');
    set({ user: null, token: null });
  }
}));

export const useTrackerStore = create((set, get) => ({
  trackedUsers: [],
  selectedUser: null,
  liveLocations: {},
  alerts: [],
  unreadAlerts: 0,
  loadingUsers: false,

  fetchUsers: async () => {
    set({ loadingUsers: true });
    try {
      const { data } = await api.get('/users');
      set({ trackedUsers: data, loadingUsers: false });
    } catch { set({ loadingUsers: false }); }
  },

  addUser: async (form) => {
    const { data } = await api.post('/users', form);
    set(s => ({ trackedUsers: [data, ...s.trackedUsers] }));
    return data;
  },

  updateUser: async (id, form) => {
    const { data } = await api.patch(`/users/${id}`, form);
    set(s => ({ trackedUsers: s.trackedUsers.map(u => u._id === id ? data : u) }));
    return data;
  },

  deleteUser: async (id) => {
    await api.delete(`/users/${id}`);
    set(s => ({ trackedUsers: s.trackedUsers.filter(u => u._id !== id) }));
  },

  giveConsent: async (id) => {
    const { data } = await api.post(`/users/${id}/consent`);
    set(s => ({ trackedUsers: s.trackedUsers.map(u => u._id === id ? data : u) }));
    return data;
  },

  selectUser: (user) => set({ selectedUser: user }),

  updateLiveLocation: (trackedUserId, locationData) => {
    set(s => ({
      liveLocations: { ...s.liveLocations, [trackedUserId]: locationData },
      trackedUsers: s.trackedUsers.map(u =>
        u._id === trackedUserId
          ? { ...u, lastLocation: { lat: locationData.location.lat, lng: locationData.location.lng, accuracy: locationData.location.accuracy, timestamp: locationData.location.timestamp }, isTracking: true, inSafeZone: locationData.inSafeZone }
          : u
      )
    }));
  },

  fetchAlerts: async (params = {}) => {
    const { data } = await api.get('/alerts', { params });
    const unread = data.filter(a => !a.acknowledged).length;
    set({ alerts: data, unreadAlerts: unread });
  },

  acknowledgeAlert: async (id) => {
    await api.patch(`/alerts/${id}/acknowledge`);
    set(s => ({
      alerts: s.alerts.map(a => a._id === id ? { ...a, acknowledged: true } : a),
      unreadAlerts: Math.max(0, s.unreadAlerts - 1)
    }));
  },

  acknowledgeAll: async () => {
    await api.patch('/alerts/acknowledge-all');
    set(s => ({ alerts: s.alerts.map(a => ({ ...a, acknowledged: true })), unreadAlerts: 0 }));
  },

  pushAlert: (alert) => {
    set(s => ({ alerts: [alert, ...s.alerts], unreadAlerts: s.unreadAlerts + 1 }));
  }
}));
