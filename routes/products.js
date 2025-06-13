const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'products',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage });

// GET /api/products - Fetch all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/products - Create new product
router.post('/', upload.single('image'), async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);

    const { name, category, price, stock, status } = req.body;

    // Validation
    if (!name || !category || !price || !stock) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newProduct = new Product({
      name,
      category,
      price: parseFloat(price),
      stock: parseInt(stock),
      status: status || 'In Stock',
      imageUrl: req.file ? req.file.secure_url || req.file.path : '',
    });

    const savedProduct = await newProduct.save();
    console.log('Product saved successfully:', savedProduct);
    res.status(201).json(savedProduct);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ 
      error: 'Failed to create product',
      details: err.message 
    });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, stock, status } = req.body;
    const updateData = {
      name,
      category,
      price: parseFloat(price),
      stock: parseInt(stock),
      status,
    };

    if (req.file) {
      updateData.imageUrl = req.file.secure_url || req.file.path;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json(updatedProduct);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    
    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
