import React, { useEffect, useState } from 'react';
import { useTrackerStore, api } from '../store';
import { useLiveLocationTracker } from '../hooks/useLiveLocationTracker';
import { formatTime } from '../utils/helpers';

const s = {
  heading: { fontSize: 22, fontWeight: 500, marginBottom: 4 },
  sub: { fontSize: 14, color: '#888', marginBottom: 24 },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  btn: (variant = 'primary') => ({
    padding: '9px 18px', border: '0.5px solid', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 500,
    ...(variant === 'primary' ? { background: '#185FA5', color: '#fff', borderColor: '#185FA5' }
      : variant === 'danger' ? { background: '#A32D2D', color: '#fff', borderColor: '#A32D2D' }
      : { background: '#fff', color: '#333', borderColor: 'rgba(0,0,0,0.2)' })
  }),
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  card: { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: 20 },
  avatar: { width: 52, height: 52, borderRadius: '50%', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 500, color: '#185FA5' },
  label: { fontSize: 12, color: '#888' },
  value: { fontSize: 14, fontWeight: 500 },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modalCard: { background: '#fff', borderRadius: 12, padding: '28px 24px', width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' },
  field: { marginBottom: 16 },
  fieldLabel: { display: 'block', fontSize: 13, color: '#5F5E5A', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, fontSize: 14, outline: 'none' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  actions: { display: 'flex', gap: 8, marginTop: 4 },
};

const DEFAULT_FORM = { name: '', age: '', simNumber: '', safeZones: [{ name: 'Home', lat: '', lng: '', radius: 200 }] };

export default function TrackedUsersPage() {
  const { trackedUsers, fetchUsers, addUser, deleteUser, giveConsent, loadingUsers } = useTrackerStore();
  const { isActive, status, startTracking, stopTracking } = useLiveLocationTracker();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const openModal = () => { setForm(DEFAULT_FORM); setError(''); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name,
        age: parseInt(form.age),
        simNumber: form.simNumber,
        safeZones: form.safeZones.filter(z => z.lat && z.lng).map(z => ({
          name: z.name, lat: parseFloat(z.lat), lng: parseFloat(z.lng), radius: parseInt(z.radius)
        }))
      };
      await addUser(payload);
      setShowModal(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleConsent = async (id, name) => {
    if (!window.confirm(`Confirm consent for tracking ${name}? This records that the guardian has given explicit approval.`)) return;
    await giveConsent(id);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name} and all their location data?`)) return;
    await deleteUser(id);
  };

  const handleTraceSim = async (id, sim, name) => {
    if (!sim) {
      alert(`No SIM number registered for ${name}.`);
      return;
    }
    try {
      if (!window.confirm(`Initiate live SIM telecom trace for ${sim}?`)) return;
      
      const { data } = await api.post(`/locations/trace-live/${id}`, { sim });
      
      const lat = data.location.lat.toFixed(4);
      const lng = data.location.lng.toFixed(4);
      const country = data.telecomInfo?.country || 'Unknown';
      
      alert(`✅ Telecom trace successful for ${sim}!\n\nCountry Routing: ${country}\nLive Coordinates: Lat ${lat}, Lng ${lng}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'SIM telecom trace failed');
    }
  };

  const handleShareTrackingLink = async (id, name) => {
    try {
      const { data } = await api.post(`/auth/tracking-token/${id}`);
      const link = `${window.location.origin}/device?token=${encodeURIComponent(data.token)}`;
      window.open(link, '_blank', 'noopener,noreferrer');
      alert(`Opened the device-sharing page for ${name}. Ask the child to open it and tap Start sharing location.`);
    } catch (err) {
      alert(err.response?.data?.error || 'Could not create tracking link');
    }
  };

  const updateZone = (i, k, v) => {
    setForm(f => {
      const z = [...f.safeZones]; z[i] = { ...z[i], [k]: v };
      return { ...f, safeZones: z };
    });
  };

  const useMyLocation = (i) => {
    navigator.geolocation?.getCurrentPosition(pos => {
      updateZone(i, 'lat', pos.coords.latitude.toFixed(6));
      updateZone(i, 'lng', pos.coords.longitude.toFixed(6));
    });
  };

  return (
    <div>
      <div style={s.topRow}>
        <div>
          <div style={s.heading}>Tracked users</div>
          <div style={{ fontSize: 14, color: '#888' }}>Manage children and safe zones</div>
        </div>
        <button style={s.btn()} onClick={openModal}>+ Add user</button>
      </div>

      {loadingUsers && <div style={{ color: '#888', fontSize: 14 }}>Loading...</div>}

      {!loadingUsers && trackedUsers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
          <div style={{ fontWeight: 500, marginBottom: 6 }}>No tracked users yet</div>
          <div style={{ fontSize: 14, marginBottom: 20 }}>Add a child or person to start monitoring</div>
          <button style={s.btn()} onClick={openModal}>Add first user</button>
        </div>
      )}

      <div style={s.grid}>
        {trackedUsers.map(u => (
          <div key={u._id} style={s.card}>
            <div style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
              <div style={s.avatar}>{u.name[0].toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 16 }}>{u.name}</div>
                <div style={{ fontSize: 13, color: '#888' }}>Age {u.age} {u.simNumber ? `• 📱 ${u.simNumber}` : ''}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: u.consentGiven ? '#EAF3DE' : '#FAEEDA', color: u.consentGiven ? '#27500A' : '#633806', fontWeight: 500 }}>
                    {u.consentGiven ? 'Consent given' : 'Awaiting consent'}
                  </span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: u.isTracking ? '#EAF3DE' : '#F1EFE8', color: u.isTracking ? '#27500A' : '#5F5E5A', fontWeight: 500 }}>
                    {u.isTracking ? 'Live' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: '#f7f6f2', borderRadius: 8, padding: '10px 12px' }}>
                <div style={s.label}>Safe zones</div>
                <div style={s.value}>{u.safeZones?.length || 0}</div>
              </div>
              <div style={{ background: '#f7f6f2', borderRadius: 8, padding: '10px 12px' }}>
                <div style={s.label}>Last seen</div>
                <div style={s.value}>{formatTime(u.lastLocation?.timestamp)}</div>
              </div>
            </div>

            {u.safeZones?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                {u.safeZones.map((z, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#888', padding: '4px 0', borderBottom: i < u.safeZones.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                    📍 {z.name} · {z.lat?.toFixed(4)}, {z.lng?.toFixed(4)} · r={z.radius}m
                  </div>
                ))}
              </div>
            )}

            <div style={s.actions}>
              <button style={{ ...s.btn('primary'), padding: '6px 12px' }} onClick={() => handleTraceSim(u._id, u.simNumber, u.name)}>Trace SIM</button>
              {u.consentGiven && (
                <>
                  <button style={{ ...s.btn('secondary'), padding: '6px 12px' }} onClick={() => handleShareTrackingLink(u._id, u.name)}>
                    Share device link
                  </button>
                  <button style={{ ...s.btn(isActive && status === 'tracking' ? 'primary' : 'secondary'), padding: '6px 12px' }} onClick={() => isActive ? stopTracking() : startTracking(u._id)}>
                    {isActive ? 'Stop live tracking' : 'Start live tracking'}
                  </button>
                </>
              )}
              {!u.consentGiven && (
                <button style={s.btn('secondary')} onClick={() => handleConsent(u._id, u.name)}>Grant consent</button>
              )}
              <button style={{ ...s.btn('secondary'), marginLeft: 'auto', color: '#A32D2D', borderColor: '#A32D2D' }} onClick={() => handleDelete(u._id, u.name)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={s.modalCard}>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 20 }}>Add tracked user</div>
            {error && <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '9px 12px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <form onSubmit={handleSave}>
              <div style={s.field}>
                <label style={s.fieldLabel}>Full name</label>
                <input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Child's name" />
              </div>
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.fieldLabel}>Age</label>
                  <input style={s.input} type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} required min="1" max="17" placeholder="e.g. 9" />
                </div>
                <div style={s.field}>
                  <label style={s.fieldLabel}>Mobile / SIM Number</label>
                  <input style={s.input} value={form.simNumber} onChange={e => setForm(f => ({ ...f, simNumber: e.target.value }))} placeholder="+1234567890" />
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 500, color: '#5F5E5A', marginBottom: 10, marginTop: 4 }}>Safe zone (home / school)</div>
              {form.safeZones.map((z, i) => (
                <div key={i} style={{ background: '#f7f6f2', borderRadius: 8, padding: '12px', marginBottom: 10 }}>
                  <div style={s.field}>
                    <label style={s.fieldLabel}>Zone name</label>
                    <input style={s.input} value={z.name} onChange={e => updateZone(i, 'name', e.target.value)} />
                  </div>
                  <div style={s.row}>
                    <div style={s.field}>
                      <label style={s.fieldLabel}>Latitude</label>
                      <input style={s.input} value={z.lat} onChange={e => updateZone(i, 'lat', e.target.value)} placeholder="e.g. 27.7172" />
                    </div>
                    <div style={s.field}>
                      <label style={s.fieldLabel}>Longitude</label>
                      <input style={s.input} value={z.lng} onChange={e => updateZone(i, 'lng', e.target.value)} placeholder="e.g. 85.3240" />
                    </div>
                  </div>
                  <button type="button" style={{ ...s.btn('secondary'), fontSize: 12, padding: '5px 10px', marginBottom: 10 }} onClick={() => useMyLocation(i)}>Use my current location</button>
                  <div>
                    <label style={s.fieldLabel}>Radius: {z.radius} m</label>
                    <input type="range" min="50" max="2000" step="50" value={z.radius} onChange={e => updateZone(i, 'radius', e.target.value)} style={{ width: '100%' }} />
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" style={s.btn()} disabled={saving}>{saving ? 'Saving...' : 'Add user'}</button>
                <button type="button" style={s.btn('secondary')} onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
