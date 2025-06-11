// routes/contact.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
// const Contact = require('../models/Contact'); // optional if storing

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER || 'rohitdahale23@gmail.com',
    pass: process.env.EMAIL_PASS, // Use app password for Gmail
  },
});

router.post(
  '/contact',
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').notEmpty().withMessage('Message is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, phone, subject, message } = req.body;

    try {
      // (Optional) Save to DB
      // await Contact.create({ firstName, lastName, email, phone, subject, message });

      // Email to company/admin
      const adminEmailOptions = {
        from: `"${firstName} ${lastName}" <${process.env.EMAIL_USER || 'rohitdahale23@gmail.com'}>`,
        to: 'rohitdahale242@gmail.com',
        subject: `New Contact Form Submission: ${subject || 'General Inquiry'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1a1a1a; color: white; padding: 20px; text-align: center;">
              <h2 style="margin: 0; color: #3b82f6;">New Contact Form Submission</h2>
            </div>
            
            <div style="padding: 30px; background-color: #f9f9f9;">
              <h3 style="color: #333; margin-bottom: 20px;">Contact Details</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; color: #555;">Name:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${firstName} ${lastName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; color: #555;">Email:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; color: #555;">Phone:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${phone || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; color: #555;">Subject:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${subject || 'General Inquiry'}</td>
                </tr>
              </table>
              
              <h3 style="color: #333; margin: 30px 0 15px 0;">Message:</h3>
              <div style="background-color: white; padding: 20px; border-left: 4px solid #3b82f6; border-radius: 4px;">
                ${message.replace(/\n/g, '<br>')}
              </div>
            </div>
            
            <div style="background-color: #1a1a1a; color: #888; padding: 20px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">This email was sent from the Anantam Aerial contact form.</p>
              <p style="margin: 5px 0 0 0;">Please respond to: ${email}</p>
            </div>
          </div>
        `,
      };

      // Confirmation email to user
      const userEmailOptions = {
        from: `"Anantam Aerial" <${process.env.EMAIL_USER || 'rohitdahale23@gmail.com'}>`,
        to: email,
        subject: 'Thank you for contacting Anantam Aerial - We\'ve received your message',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1a1a1a; color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #3b82f6;">Anantam Aerial</h1>
              <p style="margin: 10px 0 0 0; color: #ccc;">Drone & Robotics Solutions</p>
            </div>
            
            <div style="padding: 40px 30px; background-color: #f9f9f9;">
              <h2 style="color: #333; margin-bottom: 20px;">Hello ${firstName},</h2>
              
              <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                Thank you for reaching out to us! We have successfully received your message and our team will review it shortly.
              </p>
              
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333; margin-bottom: 15px;">Your Message Summary:</h3>
                <p style="margin: 5px 0; color: #666;"><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Submitted on:</strong> ${new Date().toLocaleDateString('en-IN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
              
              <p style="color: #555; line-height: 1.6; margin: 20px 0;">
                <strong>What happens next?</strong><br>
                • Our team will review your inquiry within 24 hours<br>
                • You'll receive a detailed response within 1-2 business days<br>
                • For urgent matters, feel free to call us at +91 98765 43210
              </p>
              
              <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h4 style="color: #1976d2; margin: 0 0 10px 0;">Contact Information</h4>
                <p style="margin: 5px 0; color: #555;"><strong>📍 Address:</strong> 123 Drone Avenue, Tech Park, Bangalore - 560001</p>
                <p style="margin: 5px 0; color: #555;"><strong>📧 Email:</strong> info@anantamaerial.com</p>
                <p style="margin: 5px 0; color: #555;"><strong>📞 Phone:</strong> +91 98765 43210</p>
                <p style="margin: 5px 0; color: #555;"><strong>🕒 Hours:</strong> Mon-Fri 9AM-6PM, Sat 10AM-4PM</p>
              </div>
              
              <p style="color: #555; line-height: 1.6;">
                In the meantime, feel free to explore our website to learn more about our drone solutions, robotics services, and upcoming workshops.
              </p>
            </div>
            
            <div style="background-color: #1a1a1a; color: #888; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #ccc;">Follow us for updates:</p>
              <p style="margin: 0; font-size: 12px;">
                This is an automated confirmation email. Please do not reply to this email.
                <br>For any questions, contact us at info@anantamaerial.com
              </p>
            </div>
          </div>
        `,
      };

      // Send both emails
      await Promise.all([
        transporter.sendMail(adminEmailOptions),
        transporter.sendMail(userEmailOptions)
      ]);

      res.status(200).json({ 
        message: 'Message sent successfully! Please check your email for confirmation.',
        success: true 
      });

    } catch (error) {
      console.error('Email sending error:', error);
      
      // Check if it's an email authentication error
      if (error.code === 'EAUTH') {
        return res.status(500).json({ 
          message: 'Email service configuration error. Please contact support.',
          error: 'EMAIL_AUTH_ERROR'
        });
      }
      
      res.status(500).json({ 
        message: 'Failed to send message. Please try again later.',
        error: 'SERVER_ERROR'
      });
    }
  }
);

module.exports = router;