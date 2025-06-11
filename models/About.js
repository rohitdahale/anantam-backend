const mongoose = require('mongoose');

const aboutSchema = new mongoose.Schema({
  heroTitle: String,
  heroSubtitle: String,
  story: [String],
  values: [
    {
      title: String,
      description: String,
      icon: String
    }
  ],
  team: [
    {
      name: String,
      role: String,
      description: String,
      imageUrl: String
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('About', aboutSchema);
