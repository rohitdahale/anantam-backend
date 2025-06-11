require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');

require('./config/passport');
const authRoutes = require('./routes/auth');

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Replace cookie-session with express-session
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
    secure: false // set to true in production with HTTPS
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);

const userRoutes = require('./routes/user');
app.use('/api/users', userRoutes);

const contactRoutes = require('./routes/contact');
app.use(express.json());
app.use('/api', contactRoutes);

const aboutRoutes = require('./routes/about');
app.use('/api/about', aboutRoutes);



mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => app.listen(5000, () => console.log('Server running on port 5000')))
  .catch(err => console.log(err));