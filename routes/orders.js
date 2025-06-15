const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth'); // Adjust path as needed

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/orders/create - Create order and Razorpay order
router.post('/create', async (req, res) => {
  try {
    const { items, customerInfo, totalAmount } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    if (!customerInfo || !customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      return res.status(400).json({ error: 'Customer information is required' });
    }

    if (!customerInfo.address || !customerInfo.address.street || !customerInfo.address.city || 
        !customerInfo.address.state || !customerInfo.address.zipCode) {
      return res.status(400).json({ error: 'Complete address is required' });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ error: 'Valid total amount is required' });
    }

    // Verify products and stock
    let calculatedTotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product not found: ${item.productId}` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
        });
      }

      const itemTotal = product.price * item.quantity;
      calculatedTotal += itemTotal;

      verifiedItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        imageUrl: product.imageUrl
      });
    }

    // Verify total amount
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return res.status(400).json({ error: 'Total amount mismatch' });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // Convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        customer_name: customerInfo.name,
        customer_email: customerInfo.email
      }
    });

    // Create order in database
    const count = await Order.countDocuments();
    const orderId = `ORD${Date.now()}${(count + 1).toString().padStart(4, '0')}`;
    
    const order = new Order({
      orderId,
      razorpayOrderId: razorpayOrder.id,
      customerInfo,
      items: verifiedItems,
      totalAmount,
      currency: 'INR',
      status: 'pending'
    });
    

    await order.save();

    res.status(201).json({
      success: true,
      order: {
        id: order._id,
        orderId: order.orderId,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        customerInfo: order.customerInfo,
        items: order.items,
        totalAmount: order.totalAmount
      },
      razorpayKey: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      error: 'Failed to create order',
      details: error.message 
    });
  }
});

// POST /api/orders/verify - Verify payment
router.post('/verify', async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      order_id 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
      return res.status(400).json({ error: 'Missing required payment verification parameters' });
    }

    // Find the order - check if it's MongoDB ObjectId or custom orderId
    let order;
    if (mongoose.Types.ObjectId.isValid(order_id)) {
      order = await Order.findById(order_id).populate('items.productId');
    } else {
      order = await Order.findOne({ orderId: order_id }).populate('items.productId');
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      // Update order status to failed
      order.status = 'failed';
      await order.save();
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Payment verified successfully
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.status = 'paid';
    await order.save();

    // Update product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      order: {
        id: order._id,
        orderId: order.orderId,
        status: order.status,
        totalAmount: order.totalAmount,
        paymentId: razorpay_payment_id
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      error: 'Failed to verify payment',
      details: error.message 
    });
  }
});

// GET /api/orders/my - Get all orders (for admin) - MOVED BEFORE THE GENERIC ROUTES
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    
    // Add status filter if provided
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    
    // Add delivery status filter if provided
    if (req.query.deliveryStatus && req.query.deliveryStatus !== 'all') {
      filter.deliveryStatus = req.query.deliveryStatus;
    }

    // Build sort object
    const sortField = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    const orders = await Order.find(filter)
      .populate('items.productId')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      error: 'Failed to fetch orders',
      details: error.message 
    });
  }
});

// GET /api/orders/export - Export orders to CSV
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('items.productId')
      .sort({ createdAt: -1 });

    // Create CSV content
    const csvHeader = 'Order ID,Customer Name,Email,Phone,Total Amount,Status,Delivery Status,Items,Created At\n';
    const csvRows = orders.map(order => {
      const items = order.items.map(item => `${item.name} (${item.quantity})`).join('; ');
      return [
        order.orderId,
        order.customerInfo.name,
        order.customerInfo.email,
        order.customerInfo.phone,
        order.totalAmount,
        order.status,
        order.deliveryStatus,
        `"${items}"`,
        new Date(order.createdAt).toLocaleDateString()
      ].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting orders:', error);
    res.status(500).json({ 
      error: 'Failed to export orders',
      details: error.message 
    });
  }
});

// GET /api/orders/user - Get user's own orders
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find orders by user's email (assuming you store email in customerInfo)
    const orders = await Order.find({ 
      'customerInfo.email': req.user.email
    })
      .populate('items.productId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments({ 
      'customerInfo.email': req.user.email 
    });

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ 
      error: 'Failed to fetch orders',
      details: error.message 
    });
  }
});

// GET /api/orders/:id - Get order details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let order;

    // Check if the id is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      // Query by MongoDB _id
      order = await Order.findById(id).populate('items.productId');
    } else {
      // Query by custom orderId
      order = await Order.findOne({ orderId: id }).populate('items.productId');
    }
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ 
      error: 'Failed to fetch order',
      details: error.message 
    });
  }
});

// PUT /api/orders/:id/status - Update order delivery status
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryStatus } = req.body;
    const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(deliveryStatus)) {
      return res.status(400).json({ error: 'Invalid delivery status' });
    }

    let order;
    
    // Check if the id is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      // Update by MongoDB _id
      order = await Order.findByIdAndUpdate(
        id,
        { deliveryStatus },
        { new: true }
      );
    } else {
      // Update by custom orderId
      order = await Order.findOneAndUpdate(
        { orderId: id },
        { deliveryStatus },
        { new: true }
      );
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ 
      error: 'Failed to update order status',
      details: error.message 
    });
  }
});

module.exports = router;