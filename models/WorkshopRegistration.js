const mongoose = require('mongoose');

const workshopRegistrationSchema = new mongoose.Schema({
  workshop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workshop',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  selectedDate: {
    type: String,
    required: true
  },
  participantInfo: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    experience: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      required: true
    },
    additionalInfo: {
      type: String,
      trim: true
    }
  },
  paymentInfo: {
    amount: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'paid', 'failed', 'refunded'], 
      default: 'pending' 
    },
    paymentId: { type: String },
    paymentMethod: { 
      type: String, 
      enum: ['online', 'offline', 'bank_transfer'] 
    },
    razorpayOrderId: { type: String },
    razorpaySignature: { type: String }
  },
  registrationStatus: {
    type: String,
    enum: ['registered', 'confirmed', 'cancelled', 'completed'],
    default: 'registered'
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  confirmationDate: {
    type: Date
  },
  cancellationDate: {
    type: Date
  },
  cancellationReason: {
    type: String
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
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
workshopRegistrationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate refund amount based on cancellation date
workshopRegistrationSchema.methods.calculateRefund = function() {
  const now = new Date();
  const workshopDate = new Date(this.selectedDate);
  const daysUntilWorkshop = Math.ceil((workshopDate - now) / (1000 * 60 * 60 * 24));
  
  const amount = parseFloat(this.paymentInfo.amount.replace(/[^\d.]/g, ''));
  
  if (daysUntilWorkshop >= 14) {
    return amount; // Full refund
  } else if (daysUntilWorkshop >= 7) {
    return amount * 0.5; // 50% refund
  } else {
    return 0; // No refund
  }
};

// Method to check if registration can be cancelled
workshopRegistrationSchema.methods.canCancel = function() {
  return this.registrationStatus === 'registered' || this.registrationStatus === 'confirmed';
};

module.exports = mongoose.model('WorkshopRegistration', workshopRegistrationSchema);