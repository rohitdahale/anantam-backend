const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    unique: true, 
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    // Don't require password since users can sign up via Google
    required: false
  },
  googleId: {
    type: String,
    required: false
  },
  // Add a field to track how the user was created
  authMethod: {
    type: String,
    enum: ['email', 'google', 'github'],
    default: 'email'
  },
  // Track if the user has verified their email (for future use)
  isEmailVerified: {
    type: Boolean,
    default: false
  },
   // 🆕 Add this field
   role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user' // default role
  },
  // Track creation and update times
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add a method to check if user can login with password
userSchema.methods.canLoginWithPassword = function() {
  return this.password && this.password.length > 0;
};

// Add a method to check if user was created via OAuth
userSchema.methods.isOAuthUser = function() {
  return this.googleId && !this.password;
};

module.exports = mongoose.model('User', userSchema);