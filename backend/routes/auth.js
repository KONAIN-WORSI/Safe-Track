const express = require('express');
const { body, validationResult } = require('express-validator');
const Guardian = require('../models/Guardian');
const TrackedUser = require('../models/TrackedUser');
const { authenticateToken, signToken, signTrackingToken } = require('../middleware/auth');
const router = express.Router();

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 characters'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const exists = await Guardian.findOne({ email: req.body.email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const guardian = await Guardian.create(req.body);
    const token = signToken(guardian._id);
    res.status(201).json({ token, user: guardian });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const guardian = await Guardian.findOne({ email: req.body.email }).select('+password');
    if (!guardian || !(await guardian.comparePassword(req.body.password)))
      return res.status(401).json({ error: 'Invalid email or password' });
    const token = signToken(guardian._id);
    res.json({ token, user: guardian });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// PATCH /api/auth/me
router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.alertPreferences) updates.alertPreferences = req.body.alertPreferences;

    const guardian = await Guardian.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );
    if (!guardian) return res.status(404).json({ error: 'User not found' });
    res.json({ user: guardian });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/tracking-token/:trackedUserId
router.post('/tracking-token/:trackedUserId', authenticateToken, async (req, res) => {
  try {
    const trackedUser = await TrackedUser.findOne({ _id: req.params.trackedUserId, guardian: req.user._id });
    if (!trackedUser) return res.status(404).json({ error: 'Tracked user not found' });
    if (!trackedUser.consentGiven) return res.status(403).json({ error: 'Consent not given' });

    const token = signTrackingToken(trackedUser._id);
    res.json({
      token,
      trackedUserId: trackedUser._id,
      expiresIn: process.env.TRACKING_JWT_EXPIRES_IN || '30d'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
