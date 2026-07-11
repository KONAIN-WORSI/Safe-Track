const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const guardianSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 8 },
  phone: { type: String, trim: true },
  role: { type: String, enum: ['guardian', 'admin'], default: 'guardian' },
  alertPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now }
});

guardianSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

guardianSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

guardianSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Guardian', guardianSchema);
