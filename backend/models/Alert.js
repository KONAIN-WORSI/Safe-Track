const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  trackedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'TrackedUser', required: true },
  guardian: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', required: true },
  type: {
    type: String,
    enum: ['zone_exit', 'zone_enter', 'sos', 'low_battery', 'signal_lost', 'signal_restored'],
    required: true
  },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
  message: { type: String, required: true },
  location: { lat: Number, lng: Number },
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: { type: Date },
  notificationsSent: {
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now }
});

alertSchema.index({ guardian: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
