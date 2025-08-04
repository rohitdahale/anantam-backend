const Workshop = require('../models/Workshop');
const WorkshopRegistration = require('../models/WorkshopRegistration');

// Get all workshops (public)
exports.getAllWorkshops = async (req, res) => {
  try {
    const workshops = await Workshop.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(workshops);
  } catch (error) {
    console.error('Error fetching workshops:', error);
    res.status(500).json({
      error: 'Failed to fetch workshops',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get workshop by ID (public)
exports.getWorkshopById = async (req, res) => {
  try {
    const workshop = await Workshop.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    res.json(workshop);
  } catch (error) {
    console.error('Error fetching workshop:', error);
    res.status(500).json({
      error: 'Failed to fetch workshop',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Register for workshop (for offline payments or admin registrations)
exports.registerForWorkshop = async (req, res) => {
  try {
    const { workshopId, selectedDate, participantInfo, paymentInfo } = req.body;

    // Validate required fields
    if (!workshopId || !selectedDate || !participantInfo) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find the workshop
    const workshop = await Workshop.findById(workshopId);
    if (!workshop || !workshop.isActive) {
      return res.status(404).json({ error: 'Workshop not found or inactive' });
    }

    // Check if selected date is available and has spots
    if (!workshop.hasAvailableSpots(selectedDate)) {
      return res.status(400).json({ error: 'No spots available for selected date' });
    }

    // Check if user is already registered for this workshop on this date
    const existingRegistration = await WorkshopRegistration.findOne({
      workshop: workshopId,
      user: req.user._id,
      selectedDate: selectedDate,
      registrationStatus: { $in: ['registered', 'confirmed'] }
    });

    if (existingRegistration) {
      return res.status(400).json({
        error: 'You are already registered for this workshop on the selected date'
      });
    }

    // Set default payment info for offline registrations
    const finalPaymentInfo = paymentInfo || {
      amount: workshop.price,
      status: 'pending',
      paymentMethod: 'offline'
    };

    // Create registration
    const registration = new WorkshopRegistration({
      workshop: workshopId,
      user: req.user._id,
      selectedDate,
      participantInfo,
      paymentInfo: finalPaymentInfo
    });

    await registration.save();

    // Reduce available spots
    workshop.reduceSpots(selectedDate);
    await workshop.save();

    // Populate workshop details for response
    await registration.populate('workshop');

    res.status(201).json({
      message: 'Registration successful',
      registration
    });
  } catch (error) {
    console.error('Error registering for workshop:', error);
    res.status(500).json({
      error: 'Failed to register for workshop',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user's workshop registrations (requires authentication)
exports.getUserRegistrations = async (req, res) => {
  try {
    const registrations = await WorkshopRegistration.find({
      user: req.user._id
    })
    .populate('workshop')
    .sort({ createdAt: -1 });

    res.json(registrations);
  } catch (error) {
    console.error('Error fetching user registrations:', error);
    res.status(500).json({
      error: 'Failed to fetch registrations',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Cancel workshop registration (requires authentication)
exports.cancelRegistration = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { reason } = req.body;

    const registration = await WorkshopRegistration.findOne({
      _id: registrationId,
      user: req.user._id
    }).populate('workshop');

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    if (!registration.canCancel()) {
      return res.status(400).json({
        error: 'Registration cannot be cancelled at this time'
      });
    }

    // Calculate refund
    const refundAmount = registration.calculateRefund();

    // Update registration
    registration.registrationStatus = 'cancelled';
    registration.cancellationDate = new Date();
    registration.cancellationReason = reason || 'User requested cancellation';
    registration.refundAmount = refundAmount;
    await registration.save();

    // Increase available spots
    const workshop = await Workshop.findById(registration.workshop._id);
    workshop.increaseSpots(registration.selectedDate);
    await workshop.save();

    res.json({
      message: 'Registration cancelled successfully',
      refundAmount,
      registration
    });
  } catch (error) {
    console.error('Error cancelling registration:', error);
    res.status(500).json({
      error: 'Failed to cancel registration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ADMIN FUNCTIONS (No authentication required as per request)

// Get all workshops for admin
exports.adminGetAllWorkshops = async (req, res) => {
  try {
    const workshops = await Workshop.find().sort({ createdAt: -1 });
    res.json(workshops);
  } catch (error) {
    console.error('Error fetching workshops for admin:', error);
    res.status(500).json({
      error: 'Failed to fetch workshops',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new workshop (admin) - UPDATED: This is now handled in routes with image upload
exports.createWorkshop = async (req, res) => {
  try {
    const workshop = new Workshop(req.body);
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
};

// Update workshop (admin) - UPDATED: This is now handled in routes with image upload
exports.updateWorkshop = async (req, res) => {
  try {
    const workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      req.body,
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
};

// Delete workshop (admin)
exports.deleteWorkshop = async (req, res) => {
  try {
    const workshop = await Workshop.findByIdAndDelete(req.params.id);

    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    // Note: In production, you might want to soft delete and handle existing registrations
    await WorkshopRegistration.deleteMany({ workshop: req.params.id });

    res.json({ message: 'Workshop deleted successfully' });
  } catch (error) {
    console.error('Error deleting workshop:', error);
    res.status(500).json({
      error: 'Failed to delete workshop',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Toggle workshop active status (admin)
exports.toggleWorkshopStatus = async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);

    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    workshop.isActive = !workshop.isActive;
    await workshop.save();

    res.json({
      message: `Workshop ${workshop.isActive ? 'activated' : 'deactivated'} successfully`,
      workshop
    });
  } catch (error) {
    console.error('Error toggling workshop status:', error);
    res.status(500).json({
      error: 'Failed to update workshop status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all registrations (admin)
exports.adminGetAllRegistrations = async (req, res) => {
  try {
    const { workshopId, status, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (workshopId) filter.workshop = workshopId;
    if (status) filter.registrationStatus = status;

    const registrations = await WorkshopRegistration.find(filter)
      .populate('workshop', 'title duration price')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await WorkshopRegistration.countDocuments(filter);

    res.json({
      registrations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching registrations for admin:', error);
    res.status(500).json({
      error: 'Failed to fetch registrations',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update registration status (admin)
exports.updateRegistrationStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const registration = await WorkshopRegistration.findById(req.params.id)
      .populate('workshop')
      .populate('user');

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const oldStatus = registration.registrationStatus;
    registration.registrationStatus = status;

    if (status === 'confirmed' && oldStatus !== 'confirmed') {
      registration.confirmationDate = new Date();
    }

    if (notes) {
      registration.notes = notes;
    }

    await registration.save();

    res.json({
      message: 'Registration status updated successfully',
      registration
    });
  } catch (error) {
    console.error('Error updating registration status:', error);
    res.status(500).json({
      error: 'Failed to update registration status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};