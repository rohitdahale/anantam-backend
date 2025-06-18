const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'services',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage });

// GET /api/services - Fetch all services (public)
router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ order: 1 });
    res.status(200).json(services);
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// GET /api/services/:id - Fetch single service by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const serviceId = req.params.id;
    
    const service = await Service.findOne({ 
      $or: [
        { _id: serviceId },
        { id: serviceId }
      ],
      isActive: true 
    });
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.status(200).json(service);
  } catch (err) {
    console.error('Error fetching service:', err);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// GET /api/services/admin/all - Fetch all services for admin (including inactive)
router.get('/admin/all', async (req, res) => {
  try {
    const services = await Service.find().sort({ order: 1 });
    res.status(200).json(services);
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// POST /api/services - Create new service (admin)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const {
      id,
      title,
      description,
      features,
      icon,
      order,
      isActive
    } = req.body;

    // Parse features if it's a string
    const featureArray = typeof features === 'string' ? 
      features.split(',').map(f => f.trim()).filter(f => f) : 
      features || [];

    const imageUrl = req.file ? req.file.secure_url || req.file.path : '';

    const newService = new Service({
      id,
      title,
      description,
      features: featureArray,
      icon,
      image: imageUrl,
      order: order ? parseInt(order) : 0,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user ? req.user._id : null
    });

    const savedService = await newService.save();
    res.status(201).json(savedService);
  } catch (err) {
    console.error('Error creating service:', err);
    res.status(500).json({ 
      error: 'Failed to create service',
      details: err.message 
    });
  }
});

// PUT /api/services/:id - Update service (admin)
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const {
      title,
      description,
      features,
      icon,
      order,
      isActive
    } = req.body;

    const updateData = {};
    
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (icon) updateData.icon = icon;
    if (order !== undefined) updateData.order = parseInt(order);
    if (isActive !== undefined) updateData.isActive = isActive;

    if (features) {
      updateData.features = typeof features === 'string' ? 
        features.split(',').map(f => f.trim()).filter(f => f) : 
        features;
    }

    if (req.file) {
      updateData.image = req.file.secure_url || req.file.path;
    }

    const updatedService = await Service.findOneAndUpdate(
      { 
        $or: [
          { _id: req.params.id },
          { id: req.params.id }
        ]
      },
      updateData,
      { new: true }
    );

    if (!updatedService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.status(200).json(updatedService);
  } catch (err) {
    console.error('Error updating service:', err);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// DELETE /api/services/:id - Delete service (admin)
router.delete('/:id', async (req, res) => {
  try {
    const deletedService = await Service.findOneAndDelete({
      $or: [
        { _id: req.params.id },
        { id: req.params.id }
      ]
    });
    
    if (!deletedService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.status(200).json({ message: 'Service deleted successfully' });
  } catch (err) {
    console.error('Error deleting service:', err);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// PUT /api/services/:id/toggle - Toggle service active status (admin)
router.put('/:id/toggle', async (req, res) => {
  try {
    const service = await Service.findOne({
      $or: [
        { _id: req.params.id },
        { id: req.params.id }
      ]
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    service.isActive = !service.isActive;
    await service.save();

    res.status(200).json(service);
  } catch (err) {
    console.error('Error toggling service status:', err);
    res.status(500).json({ error: 'Failed to toggle service status' });
  }
});

module.exports = router;