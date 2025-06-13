const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Professional Drones', 'Hobby Drones', 'Components', 'Accessories']
  },
  description: {
    type: String,
    required: true
  },
  features: {
    type: [String],
    default: []
  },
  specifications: {
    type: Map,
    of: String,
    default: {}
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock'],
    default: 'In Stock'
  },
  imageUrl: {
    type: String,
    default: ''
  },
  additionalImages: {
    type: [String],
    default: []
  },
  brand: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviews: [{
    userId: mongoose.Schema.Types.ObjectId,
    username: String,
    rating: Number,
    comment: String,
    date: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
