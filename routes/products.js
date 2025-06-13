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

// Add this route to your existing Express router file (after the GET '/' route)

// GET /api/products/:id - Fetch single product by ID
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Validate ObjectId format (if using MongoDB)
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid product ID format' });
    }
    
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.status(200).json(product);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products - Create new product
router.post('/', upload.array('images', 5), async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      stock,
      status,
      description,
      features,
      specifications,
      brand
    } = req.body;

    // Validation
    if (!name || !category || !price || !stock || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const featureArray = typeof features === 'string' ? features.split(',').map(f => f.trim()) : [];
    const specObject = typeof specifications === 'string' ? JSON.parse(specifications) : {};

    const imageUrls = req.files.map(file => file.secure_url || file.path);
    const mainImage = imageUrls.length > 0 ? imageUrls[0] : '';

    const newProduct = new Product({
      name,
      category,
      price: parseFloat(price),
      stock: parseInt(stock),
      status: status || 'In Stock',
      description,
      features: featureArray,
      specifications: specObject,
      brand: brand || '',
      imageUrl: mainImage,
      additionalImages: imageUrls.slice(1),
    });

    const savedProduct = await newProduct.save();
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
router.put('/:id', upload.array('images', 5), async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      stock,
      status,
      description,
      features,
      specifications,
      brand
    } = req.body;

    const updateData = {
      name,
      category,
      price: parseFloat(price),
      stock: parseInt(stock),
      status,
      description,
      brand
    };

    if (features) {
      updateData.features = typeof features === 'string' ? features.split(',').map(f => f.trim()) : [];
    }

    if (specifications) {
      updateData.specifications = typeof specifications === 'string' ? JSON.parse(specifications) : {};
    }

    if (req.files && req.files.length > 0) {
      const imageUrls = req.files.map(file => file.secure_url || file.path);
      updateData.imageUrl = imageUrls[0];
      updateData.additionalImages = imageUrls.slice(1);
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
