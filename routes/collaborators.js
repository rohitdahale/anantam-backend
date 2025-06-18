const express = require('express');
const Collaborator = require('../models/Collaborator');
const adminOnly = require('../middleware/adminOnly');
const upload = require('../middleware/upload');
const cloudinary = require('../utils/cloudinary');
const router = express.Router();

// GET all collaborators (public)
router.get('/', async (req, res) => {
  try {
    const collaborators = await Collaborator.find().sort({ createdAt: -1 });
    res.json(collaborators);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE collaborator (admin)
router.post('/', upload.single('logo'), async (req, res) => {
  try {
    const { name, category, description } = req.body;

    if (!req.file) return res.status(400).json({ error: 'Logo image is required.' });

    const uploadResult = await cloudinary.uploader.upload_stream(
      { folder: 'collaborators' },
      async (error, result) => {
        if (error) return res.status(500).json({ error: 'Cloudinary upload failed.' });

        const newCollaborator = new Collaborator({
          name,
          category,
          description,
          logo: result.secure_url
        });

        const saved = await newCollaborator.save();
        res.status(201).json(saved);
      }
    );

    uploadResult.end(req.file.buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE collaborator
router.put('/:id', upload.single('logo'), async (req, res) => {
  try {
    const { name, category, description } = req.body;
    const updateData = { name, category, description };

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({ folder: 'collaborators' }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }).end(req.file.buffer);
      });
      updateData.logo = uploadResult.secure_url;
    }

    const updated = await Collaborator.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE collaborator
router.delete('/:id', async (req, res) => {
  try {
    await Collaborator.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
