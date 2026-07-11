const express = require('express');
const Alert = require('../models/Alert');
const router = express.Router();

// GET all alerts for guardian
router.get('/', async (req, res) => {
  try {
    const filter = { guardian: req.user._id };
    if (req.query.unread === 'true') filter.acknowledged = false;
    if (req.query.userId) filter.trackedUser = req.query.userId;
    const alerts = await Alert.find(filter)
      .populate('trackedUser', 'name age')
      .sort('-createdAt')
      .limit(parseInt(req.query.limit) || 50);
    res.json(alerts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH acknowledge alert
router.patch('/:id/acknowledge', async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, guardian: req.user._id },
      { acknowledged: true, acknowledgedAt: new Date() },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'Not found' });
    res.json(alert);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH acknowledge all
router.patch('/acknowledge-all', async (req, res) => {
  try {
    await Alert.updateMany(
      { guardian: req.user._id, acknowledged: false },
      { acknowledged: true, acknowledgedAt: new Date() }
    );
    res.json({ message: 'All alerts acknowledged' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
