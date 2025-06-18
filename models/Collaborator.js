const mongoose = require('mongoose');

const CollaboratorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String, required: true }, // Cloudinary URL
  category: { type: String, required: true },
  description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Collaborator', CollaboratorSchema);
