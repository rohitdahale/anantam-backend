const express = require('express');
const { 
  getAllWorkshops, 
  getWorkshopById, 
  registerForWorkshop, 
  getUserRegistrations, 
  cancelRegistration, 
  adminGetAllWorkshops, 
  createWorkshop, 
  updateWorkshop, 
  deleteWorkshop, 
  toggleWorkshopStatus, 
  adminGetAllRegistrations, 
  updateRegistrationStatus 
} = require('../controllers/workshopController');
const authMiddleware = require('../middleware/auth');

// ADD THESE MISSING IMPORTS
const Workshop = require('../models/Workshop');
const WorkshopRegistration = require('../models/WorkshopRegistration');

// ADD MULTER AND CLOUDINARY IMPORTS
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Configure Cloudinary storage for workshops
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'workshops',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage });

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order for workshop registration
router.post('/payment/create', authMiddleware, async (req, res) => {
  try {
    const { workshopId, selectedDate, participantInfo } = req.body;

    // Find the workshop
    const workshop = await Workshop.findById(workshopId);
    if (!workshop || !workshop.isActive) {
      return res.status(404).json({ error: 'Workshop not found or inactive' });
    }

    // Check if selected date is available
    if (!workshop.hasAvailableSpots(selectedDate)) {
      return res.status(400).json({ error: 'No spots available for selected date' });
    }

    // Check existing registration
    const existingRegistration = await WorkshopRegistration.findOne({
      workshop: workshopId,
      user: req.user._id,
      selectedDate: selectedDate,
      registrationStatus: { $in: ['registered', 'confirmed'] }
    });

    if (existingRegistration) {
      return res.status(400).json({ error: 'Already registered for this workshop on selected date' });
    }

    const amount = parseFloat(workshop.price.replace(/[^\d.]/g, ''));

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `workshop_${Date.now()}`,
      notes: {
        workshop_id: workshopId,
        user_id: req.user._id.toString(),
        selected_date: selectedDate,
        participant_name: participantInfo.name
      }
    });

    res.status(201).json({
      success: true,
      order: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        workshopTitle: workshop.title,
        selectedDate,
        participantInfo
      },
      razorpayKey: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({
      error: 'Failed to create payment order',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify payment and complete registration
router.post('/payment/verify', authMiddleware, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      workshopId,
      selectedDate,
      participantInfo
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification parameters' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Find the workshop
    const workshop = await Workshop.findById(workshopId);
    if (!workshop || !workshop.isActive) {
      return res.status(404).json({ error: 'Workshop not found or inactive' });
    }

    // Check if spots still available
    if (!workshop.hasAvailableSpots(selectedDate)) {
      return res.status(400).json({ error: 'No spots available for selected date' });
    }

    // Create registration with payment info
    const registration = new WorkshopRegistration({
      workshop: workshopId,
      user: req.user._id,
      selectedDate,
      participantInfo,
      paymentInfo: {
        amount: workshop.price,
        status: 'paid',
        paymentId: razorpay_payment_id,
        paymentMethod: 'online',
        razorpayOrderId: razorpay_order_id,
        razorpaySignature: razorpay_signature
      }
    });

    await registration.save();

    // Reduce available spots
    workshop.reduceSpots(selectedDate);
    await workshop.save();

    // Populate workshop details for response
    await registration.populate('workshop');

    res.status(201).json({
      success: true,
      message: 'Payment verified and registration successful',
      registration
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      error: 'Failed to verify payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUBLIC ROUTES
router.get('/', getAllWorkshops);
router.get('/:id', getWorkshopById);

// USER ROUTES (require authentication)
router.post('/register', authMiddleware, registerForWorkshop);
router.get('/user/registrations', authMiddleware, getUserRegistrations);
router.put('/user/registrations/:registrationId/cancel', authMiddleware, cancelRegistration);

// ADMIN ROUTES (no authentication required as per request)
router.get('/admin/workshops', adminGetAllWorkshops);

// Updated admin routes with image upload support
router.post('/admin/workshops', upload.single('image'), async (req, res) => {
  try {
    const workshopData = { ...req.body };
    
    // Parse JSON fields that come as strings from FormData
    if (workshopData.upcoming && typeof workshopData.upcoming === 'string') {
      try {
        workshopData.upcoming = JSON.parse(workshopData.upcoming);
      } catch (parseError) {
        return res.status(400).json({ error: 'Invalid upcoming data format' });
      }
    }
    
    if (workshopData.curriculum && typeof workshopData.curriculum === 'string') {
      try {
        workshopData.curriculum = JSON.parse(workshopData.curriculum);
      } catch (parseError) {
        return res.status(400).json({ error: 'Invalid curriculum data format' });
      }
    }
    
    // Parse numeric fields
    if (workshopData.capacity && typeof workshopData.capacity === 'string') {
      workshopData.capacity = parseInt(workshopData.capacity);
    }
    
    // If image was uploaded, use the Cloudinary URL
    if (req.file) {
      workshopData.image = req.file.secure_url || req.file.path;
    }
    
    const workshop = new Workshop(workshopData);
    await workshop.save();
    
    res.status(201).json({ 
      message: 'Workshop created successfully', 
      workshop 
    });
  } catch (error) {
    console.error('Error creating workshop:', error);
    res.status(500).json({ 
      error: 'Failed to create workshop', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

router.put('/admin/workshops/:id', upload.single('image'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Parse JSON fields that come as strings from FormData
    if (updateData.upcoming && typeof updateData.upcoming === 'string') {
      try {
        updateData.upcoming = JSON.parse(updateData.upcoming);
      } catch (parseError) {
        return res.status(400).json({ error: 'Invalid upcoming data format' });
      }
    }
    
    if (updateData.curriculum && typeof updateData.curriculum === 'string') {
      try {
        updateData.curriculum = JSON.parse(updateData.curriculum);
      } catch (parseError) {
        return res.status(400).json({ error: 'Invalid curriculum data format' });
      }
    }
    
    // Parse numeric fields
    if (updateData.capacity && typeof updateData.capacity === 'string') {
      updateData.capacity = parseInt(updateData.capacity);
    }
    
    // If new image was uploaded, use the Cloudinary URL
    if (req.file) {
      updateData.image = req.file.secure_url || req.file.path;
    }
    
    const workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }
    
    res.json({ 
      message: 'Workshop updated successfully', 
      workshop 
    });
  } catch (error) {
    console.error('Error updating workshop:', error);
    res.status(500).json({ 
      error: 'Failed to update workshop', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Keep the original routes for backwards compatibility
router.delete('/admin/workshops/:id', deleteWorkshop);
router.patch('/admin/workshops/:id/toggle-status', toggleWorkshopStatus);

// Admin registration management
router.get('/admin/registrations', adminGetAllRegistrations);
router.put('/admin/registrations/:id/status', updateRegistrationStatus);

module.exports = router;