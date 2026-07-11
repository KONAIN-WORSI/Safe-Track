const express = require('express');
const { body, validationResult } = require('express-validator');
const TrackedUser = require('../models/TrackedUser');
const router = express.Router();

// GET all tracked users for guardian
router.get('/', async (req, res) => {
  try {
    const users = await TrackedUser.find({ guardian: req.user._id }).sort('-createdAt');
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create tracked user
router.post('/', [
  body('name').trim().notEmpty(),
  body('age').isInt({ min: 1, max: 17 }),
  body('simNumber').optional().trim(),
  body('safeZones').optional().isArray()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const user = await TrackedUser.create({ ...req.body, guardian: req.user._id });
    res.status(201).json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single tracked user
router.get('/:id', async (req, res) => {
  try {
    const user = await TrackedUser.findOne({ _id: req.params.id, guardian: req.user._id });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH update tracked user
router.patch('/:id', async (req, res) => {
  try {
    const user = await TrackedUser.findOneAndUpdate(
      { _id: req.params.id, guardian: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE tracked user
router.delete('/:id', async (req, res) => {
  try {
    const user = await TrackedUser.findOneAndDelete({ _id: req.params.id, guardian: req.user._id });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST give consent
router.post('/:id/consent', async (req, res) => {
  try {
    const user = await TrackedUser.findOneAndUpdate(
      { _id: req.params.id, guardian: req.user._id },
      { consentGiven: true, consentTimestamp: new Date() },
      { new: true }
    );
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
