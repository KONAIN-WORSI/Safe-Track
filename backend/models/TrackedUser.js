const mongoose = require('mongoose');

const safeZoneSchema = new mongoose.Schema({
  name: { type: String, default: 'Home' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  radius: { type: Number, default: 200, min: 50, max: 5000 }
});

const trackedUserSchema = new mongoose.Schema({
  guardian: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', required: true },
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true, min: 1, max: 17 },
  photo: { type: String },
  simNumber: { type: String, trim: true },
  deviceToken: { type: String, unique: true, sparse: true },
  consentGiven: { type: Boolean, default: false },
  consentTimestamp: { type: Date },
  isTracking: { type: Boolean, default: false },
  safeZones: [safeZoneSchema],
  lastLocation: {
    lat: Number,
    lng: Number,
    accuracy: Number,
    timestamp: Date
  },
  inSafeZone: { type: Boolean, default: true },
  safeZoneName: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TrackedUser', trackedUserSchema);
