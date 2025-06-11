const express = require('express');
const router = express.Router();
const About = require('../models/About');

// Update or Create About Page Data
router.post('/', async (req, res) => {
  try {
    const existing = await About.findOne();
    if (existing) {
      const updated = await About.findByIdAndUpdate(existing._id, req.body, { new: true });
      return res.status(200).json({ message: 'About page updated successfully', about: updated });
    } else {
      const created = await About.create(req.body);
      return res.status(201).json({ message: 'About page created successfully', about: created });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Optional: Get About Page Data
router.get('/', async (req, res) => {
  try {
    const data = await About.findOne();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch', error: err.message });
  }
});

module.exports = router;
