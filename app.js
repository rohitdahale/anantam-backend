require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Load middlewares
const authMiddleware = require('./middleware/auth');
const adminOnly = require('./middleware/adminOnly'); // You must create this

// Load Passport config
require('./config/passport');

// Load route handlers
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const contactRoutes = require('./routes/contact');
const aboutRoutes = require('./routes/about');
const productRoutes = require('./routes/products');
const userClientRoutes = require('./routes/users.client');
const orderRoutes = require('./routes/orders');
const workshopRoutes = require('./routes/workshop');
const serviceRoutes = require('./routes/services');
const collaboratorRoutes = require('./routes/collaborators');


const app = express();

// --- MIDDLEWARE CONFIGURATIONS ---

// CORS config
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://anantamaerialsandrobotics.com'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session config
app.use(session({
  secret: process.env.COOKIE_KEY || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI
  }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: false // true in production w/ HTTPS
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// --- ROUTES ---

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);          // Admin/user management
app.use('/api', contactRoutes);             // Contact form or feedback
app.use('/api/about', aboutRoutes);         // About page data
app.use('/api/products', productRoutes);    // Products listing
app.use('/api/user', userClientRoutes);    // Public user-facing routes
app.use('/api/orders', orderRoutes);        // Orders
app.use('/api/workshops', workshopRoutes);  // Workshops
app.use('/api/services', serviceRoutes);
app.use('/api/collaborators', collaboratorRoutes);
// Make sure you have this line

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// --- DATABASE & SERVER START ---
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  app.listen(5000, () => {
    console.log('🚀 Server running on http://localhost:5000');
  });
})
.catch(err => {
  console.error('❌ Database connection error:', err);
});

module.exports = app;
