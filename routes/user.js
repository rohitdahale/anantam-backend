const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const router = express.Router();

// GET /api/users - Get all users (Admin only)
router.get('/', adminOnly, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password') // Exclude password field
      .sort({ createdAt: -1 }); // Sort by newest first

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      message: error.message 
    });
  }
});

// GET /api/users/:id - Get single user (Admin only)
router.get('/:id', adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user',
      message: error.message 
    });
  }
});

// POST /api/users - Create new user (Admin only)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Name, email, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User already exists',
        message: 'A user with this email already exists' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format',
        message: 'Please provide a valid email address' 
      });
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password too weak',
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || 'user',
      phone: phone?.trim() || undefined,
      authMethod: 'email',
      isEmailVerified: false
    });

    await newUser.save();

    // Return user without password
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        message: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Duplicate entry',
        message: 'A user with this email already exists'
      });
    }

    res.status(500).json({ 
      error: 'Failed to create user',
      message: error.message 
    });
  }
});

// PUT /api/users/:id - Update user (Admin only)
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { name, email, role, phone } = req.body;
    const userId = req.params.id;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'The user you are trying to update does not exist'
      });
    }

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Name and email are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format',
        message: 'Please provide a valid email address' 
      });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(),
      _id: { $ne: userId } // Exclude current user
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Email already taken',
        message: 'Another user is already using this email address'
      });
    }

    // Prevent admin from removing their own admin role
    if (req.user.id === userId && role !== 'admin' && user.role === 'admin') {
      return res.status(400).json({ 
        error: 'Cannot modify own role',
        message: 'You cannot remove your own admin privileges'
      });
    }

    // Update user fields
    const updateData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role || user.role,
      phone: phone?.trim() || undefined,
      updatedAt: new Date()
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        message: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Duplicate entry',
        message: 'A user with this email already exists'
      });
    }

    res.status(500).json({ 
      error: 'Failed to update user',
      message: error.message 
    });
  }
});

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'The user you are trying to delete does not exist'
      });
    }

    // Prevent admin from deleting themselves
    if (req.user.id === userId) {
      return res.status(400).json({ 
        error: 'Cannot delete own account',
        message: 'You cannot delete your own account'
      });
    }

    // Check if this is the last admin user
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ 
          error: 'Cannot delete last admin',
          message: 'You cannot delete the last admin user. Assign admin role to another user first.'
        });
      }
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      error: 'Failed to delete user',
      message: error.message 
    });
  }
});

// PUT /api/users/:id/role - Change user role (Admin only)
router.put('/:id/role', adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    // Validate role
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role',
        message: 'Role must be either "admin" or "user"'
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'The user you are trying to update does not exist'
      });
    }

    // Prevent admin from removing their own admin role
    if (req.user.id === userId && role !== 'admin' && user.role === 'admin') {
      return res.status(400).json({ 
        error: 'Cannot modify own role',
        message: 'You cannot remove your own admin privileges'
      });
    }

    // Check if trying to remove admin role from last admin
    if (user.role === 'admin' && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ 
          error: 'Cannot remove last admin',
          message: 'You cannot remove admin role from the last admin user'
        });
      }
    }

    // Update user role
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ 
      error: 'Failed to update user role',
      message: error.message 
    });
  }
});

// GET /api/users/stats - Get user statistics (Admin only)
router.get('/admin/stats', adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const regularUsers = await User.countDocuments({ role: 'user' });
    const emailAuth = await User.countDocuments({ authMethod: 'email' });
    const googleAuth = await User.countDocuments({ authMethod: 'google' });
    const githubAuth = await User.countDocuments({ authMethod: 'github' });
    const verifiedUsers = await User.countDocuments({ isEmailVerified: true });

    // Get recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });

    res.json({
      total: totalUsers,
      admins: adminUsers,
      users: regularUsers,
      authMethods: {
        email: emailAuth,
        google: googleAuth,
        github: githubAuth
      },
      verified: verifiedUsers,
      recent: recentUsers
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user statistics',
      message: error.message 
    });
  }
});

module.exports = router;