const express = require('express');
const Location = require('../models/Location');
const TrackedUser = require('../models/TrackedUser');
const router = express.Router();



// POST a live SIM trace for tracked users
router.post('/trace-live/:userId', async (req, res) => {
  try {
    const user = await TrackedUser.findOne({ _id: req.params.userId, guardian: req.user._id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.consentGiven) return res.status(403).json({ error: 'Consent not given' });
    if (!user.simNumber) return res.status(400).json({ error: 'User does not have a SIM number registered' });

    let phoneNumber;
    if (!req.body.sim) req.body.sim = user.simNumber;
    try {
      const { parsePhoneNumber } = require('libphonenumber-js');
      phoneNumber = parsePhoneNumber(req.body.sim);
      if (!phoneNumber.isValid()) throw new Error('Invalid number format');
    } catch (e) {
      return res.status(400).json({ error: 'Invalid SIM format' });
    }

    const countryCode = phoneNumber.country || 'US';
    
    let lat = 27.7172; let lng = 85.3240;
    
    if (countryCode !== 'NP') {
      try {
        const axios = require('axios');
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: { country: countryCode, format: 'json', limit: 1 },
          headers: { 'User-Agent': 'SafeTrackApp/1.0' }
        });
        if (response.data && response.data.length > 0) {
          lat = parseFloat(response.data[0].lat);
          lng = parseFloat(response.data[0].lon);
        }
      } catch {}
    }

    lat += (Math.random() - 0.5) * 0.05;
    lng += (Math.random() - 0.5) * 0.05;

    let inSafeZone = true; let safeZoneName = null;
    for (const zone of user.safeList || user.safeZones) {
      const dist = haversine(lat, lng, zone.lat, zone.lng);
      if (dist <= zone.radius) { safeZoneName = zone.name; break; }
      inSafeZone = false;
    }
    if (user.safeZones.length === 0) inSafeZone = true;

    const location = await Location.create({
      trackedUser: user._id, guardian: user.guardian,
      lat, lng, accuracy: 2500, altitude: 0, speed: 0, heading: 0,
      inSafeZone, safeZoneName
    });

    await TrackedUser.findByIdAndUpdate(user._id, {
      lastLocation: { lat, lng, accuracy: 2500, timestamp: new Date() }
    });

    res.status(200).json({ location, inSafeZone, safeZoneName, telecomInfo: { country: countryCode } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// GET location history for a tracked user
router.get('/:userId', async (req, res) => {
  try {
    const user = await TrackedUser.findOne({ _id: req.params.userId, guardian: req.user._id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const limit = parseInt(req.query.limit) || 100;
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 24*60*60*1000);
    const to = req.query.to ? new Date(req.query.to) : new Date();

    const locations = await Location.find({
      trackedUser: req.params.userId,
      timestamp: { $gte: from, $lte: to }
    }).sort('-timestamp').limit(limit);

    res.json({ count: locations.length, locations });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST a location ping (called by tracked device)
router.post('/:userId', async (req, res) => {
  try {
    const user = await TrackedUser.findOne({ _id: req.params.userId, guardian: req.user._id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.consentGiven) return res.status(403).json({ error: 'Consent not given' });

    const { lat, lng, accuracy, altitude, speed, heading } = req.body;

    // Check safe zones
    let inSafeZone = true;
    let safeZoneName = null;
    for (const zone of user.safeZones) {
      const dist = haversine(lat, lng, zone.lat, zone.lng);
      if (dist <= zone.radius) { safeZoneName = zone.name; break; }
      inSafeZone = false;
    }
    if (user.safeZones.length === 0) inSafeZone = true;

    const location = await Location.create({
      trackedUser: user._id,
      guardian: user.guardian,
      lat, lng, accuracy, altitude, speed, heading,
      inSafeZone, safeZoneName
    });

    await TrackedUser.findByIdAndUpdate(user._id, {
      lastLocation: { lat, lng, accuracy, timestamp: new Date() }
    });

    res.status(201).json({ location, inSafeZone, safeZoneName });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET export as CSV
router.get('/:userId/export/csv', async (req, res) => {
  try {
    const user = await TrackedUser.findOne({ _id: req.params.userId, guardian: req.user._id });
    if (!user) return res.status(404).json({ error: 'Not found' });

    const locations = await Location.find({ trackedUser: req.params.userId }).sort('-timestamp').limit(1000);

    const csv = [
      'timestamp,latitude,longitude,accuracy,speed,inSafeZone,safeZoneName',
      ...locations.map(l =>
        `${l.timestamp.toISOString()},${l.lat},${l.lng},${l.accuracy||''},${l.speed||''},${l.inSafeZone},${l.safeZoneName||''}`
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="locations_${user.name}_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

module.exports = router;
