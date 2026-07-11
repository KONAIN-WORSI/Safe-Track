const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  trackedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'TrackedUser', required: true },
  guardian: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  accuracy: { type: Number },
  altitude: { type: Number },
  speed: { type: Number },
  heading: { type: Number },
  address: { type: String },
  inSafeZone: { type: Boolean, default: true },
  safeZoneName: { type: String },
  timestamp: { type: Date, default: Date.now }
});

locationSchema.index({ trackedUser: 1, timestamp: -1 });
locationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }); // 30-day TTL

module.exports = mongoose.model('Location', locationSchema);
