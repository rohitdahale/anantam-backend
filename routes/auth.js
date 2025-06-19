const express = require('express');
const { signup, signin } = require('../controllers/authController');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: 'https://anantamaerialsandrobotics.com/login?error=auth_failed' }),
  (req, res) => {
    // Generate JWT token for Google authenticated user
    const token = jwt.sign({ id: req.user._id,    role: req.user.role 
    }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });
    
    // Determine redirect URL based on user role
  const redirectUrl = req.user.role === 'admin' 
  ? 'https://anantamaerialsandrobotics.com/admin' 
  : 'https://anantamaerialsandrobotics.com/';

    // Redirect to frontend with token as query parameter
    res.redirect(`https://anantamaerialsandrobotics.com/auth/success?token=${token}&user=${encodeURIComponent(JSON.stringify({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role // include role here too
    }))}`);
  });

  

module.exports = router;