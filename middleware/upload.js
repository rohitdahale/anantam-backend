const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const storage = multer.memoryStorage(); // We'll use buffer for Cloudinary

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;
