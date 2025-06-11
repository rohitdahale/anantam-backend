// routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Optional: Middleware to protect admin route
const isAdmin = (req, res, next) => {
  // Example check, adapt based on your auth system
  if (req.isAuthenticated() && req.user && req.user.authMethod === 'email' && req.user.role === 'Admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
};

// GET all users (for admin)
router.get('/', /* isAdmin, */ async (req, res) => {
  try {
    const users = await User.find().select('-password'); // exclude passwords
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;
