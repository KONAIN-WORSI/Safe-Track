const TrackedUser = require('../models/TrackedUser');
const Location = require('../models/Location');
const Alert = require('../models/Alert');
const { sendEmailAlert, sendSmsAlert } = require('../services/notifications');

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function handleSocketConnection(io) {
  io.on('connection', (socket) => {
    const authUser = socket.user;
    const isTrackingClient = authUser?.type === 'tracking';
    const guardianId = isTrackingClient ? null : authUser.id;
    const trackedUserId = isTrackingClient ? authUser.id : null;

    console.log(`${isTrackingClient ? 'Tracked device' : 'Guardian'} connected: ${authUser.id}`);

    if (!isTrackingClient) {
      socket.join(`guardian:${guardianId}`);
    } else {
      socket.join(`tracked:${trackedUserId}`);
    }

    socket.on('location:ping', async (data) => {
      try {
        const { trackedUserId: incomingTrackedUserId, lat, lng, accuracy, speed, heading, altitude } = data;
        const resolvedTrackedUserId = incomingTrackedUserId || trackedUserId;

        if (!resolvedTrackedUserId) {
          return socket.emit('error', { message: 'Tracked user ID required' });
        }

        const trackedUser = await TrackedUser.findOne({
          _id: resolvedTrackedUserId,
          ...(isTrackingClient ? {} : { guardian: guardianId }),
          consentGiven: true
        });

        if (!trackedUser) return socket.emit('error', { message: 'User not found or consent not given' });

        const safeZones = trackedUser.safeZones || [];
        let inSafeZone = safeZones.length === 0;
        let safeZoneName = null;

        for (const zone of safeZones) {
          const dist = haversine(lat, lng, zone.lat, zone.lng);
          if (dist <= zone.radius) {
            inSafeZone = true;
            safeZoneName = zone.name;
            break;
          }
        }

        const location = await Location.create({
          trackedUser: resolvedTrackedUserId,
          guardian: trackedUser.guardian,
          lat, lng, accuracy, speed, heading, altitude,
          inSafeZone, safeZoneName
        });

        await TrackedUser.findByIdAndUpdate(resolvedTrackedUserId, {
          lastLocation: { lat, lng, accuracy, timestamp: new Date() },
          isTracking: true
        });

        io.to(`guardian:${trackedUser.guardian}`).emit('location:update', {
          trackedUserId: resolvedTrackedUserId,
          location: { lat, lng, accuracy, speed, timestamp: location.timestamp },
          inSafeZone,
          safeZoneName
        });

        if (!inSafeZone && safeZones.length > 0) {
          const recentAlert = await Alert.findOne({
            trackedUser: resolvedTrackedUserId,
            type: 'zone_exit',
            createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
          });

          if (!recentAlert) {
            const alert = await Alert.create({
              trackedUser: resolvedTrackedUserId,
              guardian: trackedUser.guardian,
              type: 'zone_exit',
              severity: 'critical',
              message: `${trackedUser.name} has left the safe zone!`,
              location: { lat, lng }
            });

            io.to(`guardian:${trackedUser.guardian}`).emit('alert:new', alert);
          }
        }
      } catch (err) {
        console.error('location:ping error', err);
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('sos:trigger', async (data) => {
      const { trackedUserId: incomingTrackedUserId, lat, lng } = data;
      try {
        const resolvedTrackedUserId = incomingTrackedUserId || trackedUserId;
        if (!resolvedTrackedUserId) return;

        const trackedUser = await TrackedUser.findOne({ _id: resolvedTrackedUserId, ...(isTrackingClient ? {} : { guardian: guardianId }) });
        if (!trackedUser) return;

        const alert = await Alert.create({
          trackedUser: resolvedTrackedUserId,
          guardian: trackedUser.guardian,
          type: 'sos',
          severity: 'critical',
          message: `SOS triggered by ${trackedUser.name}!`,
          location: { lat, lng }
        });

        io.to(`guardian:${trackedUser.guardian}`).emit('alert:sos', alert);
      } catch (err) { console.error('sos error', err); }
    });

    socket.on('disconnect', async () => {
      console.log(`${isTrackingClient ? 'Tracked device' : 'Guardian'} disconnected: ${authUser.id}`);
      if (isTrackingClient) {
        try {
          await TrackedUser.findByIdAndUpdate(authUser.id, { isTracking: false });
        } catch (err) {
          console.error('Failed to reset isTracking:', err.message);
        }
      }
    });
  });
}

module.exports = { handleSocketConnection };
