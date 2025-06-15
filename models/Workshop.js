const mongoose = require('mongoose');

const workshopSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    required: true,
    default: 'https://images.pexels.com/photos/442584/pexels-photo-442584.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: String,
    required: true,
    trim: true
  },
  schedule: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    default: 'Anantam Training Center, Bangalore'
  },
  price: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  level: {
    type: String,
    required: true,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
    default: 'Beginner'
  },
  upcoming: [{
    date: {
      type: String,
      required: true
    },
    spots: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  curriculum: [{
    type: String,
    required: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
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
workshopSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if workshop has available spots for a specific date
workshopSchema.methods.hasAvailableSpots = function(date) {
  const session = this.upcoming.find(session => session.date === date);
  return session && session.spots > 0;
};

// Method to reduce spots for a specific date
workshopSchema.methods.reduceSpots = function(date, count = 1) {
  const session = this.upcoming.find(session => session.date === date);
  if (session && session.spots >= count) {
    session.spots -= count;
    return true;
  }
  return false;
};

// Method to increase spots for a specific date (for cancellations)
workshopSchema.methods.increaseSpots = function(date, count = 1) {
  const session = this.upcoming.find(session => session.date === date);
  if (session) {
    session.spots += count;
    return true;
  }
  return false;
};

module.exports = mongoose.model('Workshop', workshopSchema);