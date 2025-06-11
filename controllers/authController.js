const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      // Check if user exists but was created via Google OAuth
      if (userExists.googleId && !userExists.password) {
        return res.status(400).json({ 
          message: 'An account with this email already exists. Please sign in with Google or reset your password.' 
        });
      }
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    res.status(201).json({ message: 'Account created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed' });
  }
};

exports.signin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if user was created via Google OAuth and doesn't have a password
    if (user.googleId && !user.password) {
      return res.status(401).json({ 
        message: 'This account was created using Google. Please sign in with Google.' 
      });
    }

    // Check if user has a password set
    if (!user.password) {
      return res.status(401).json({ 
        message: 'No password set for this account. Please use social login or reset your password.' 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ error: 'Signin failed' });
  }
};