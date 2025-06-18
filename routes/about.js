const express = require('express');
const router = express.Router();
const About = require('../models/About');
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary storage for all image uploads
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'about-page',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [
      { width: 800, height: 600, crop: 'fill', quality: 'auto' }, // For hero and story images
    ]
  },
});

// Configure Cloudinary storage specifically for team member images
const teamStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'about-page/team',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', quality: 'auto', gravity: 'face' }
    ]
  },
});

const upload = multer({ storage });
const teamUpload = multer({ storage: teamStorage });

// GET /api/about - Fetch about page data
router.get('/', async (req, res) => {
  try {
    const aboutData = await About.findOne();
    
    if (!aboutData) {
      // Return default structure if no data exists
      return res.status(200).json({
        heroTitle: "About Anantam Aerials and Robotics",
        heroSubtitle: "Pioneering advanced aerial solutions for a connected future.",
        heroBackgroundImage: "https://images.pexels.com/photos/442584/pexels-photo-442584.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        story: [
          "Founded in 2021, Anantam Aerials and Robotics was born from a passion for innovation and a vision to transform industries through advanced drone technology. What began as a small team of enthusiasts has grown into a leading provider of comprehensive aerial solutions.",
          "Our journey started with a simple mission: to make cutting-edge aerial technology accessible to businesses across sectors. Today, we serve clients ranging from construction and agriculture to filmmaking and emergency services.",
          "With a team of skilled engineers, designers, and industry experts, we continue to push the boundaries of what's possible in the drone ecosystem, constantly evolving our offerings to meet the changing needs of our clients."
        ],
        storyImage: "https://images.pexels.com/photos/1087180/pexels-photo-1087180.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        values: [
          {
            title: "Innovation",
            description: "Constantly pushing the boundaries of what's possible in aerial technology.",
            icon: "Zap"
          },
          {
            title: "Excellence", 
            description: "Commitment to delivering the highest quality in every product and service.",
            icon: "Award"
          },
          {
            title: "Precision",
            description: "Accuracy and attention to detail in all our operations and solutions.",
            icon: "Target"
          },
          {
            title: "Collaboration",
            description: "Working closely with clients to create tailored solutions for their unique needs.",
            icon: "Users"
          }
        ],
        team: [
          {
            name: "Capt. Abhishek Patil",
            role: "Founder & CEO",
            description: "Aerospace engineer with 15+ years of experience in drone technology and robotics systems.",
            imageUrl: "src/assets/capt.jpg"
          },
          {
            name: "Tatpar Kunghadkar",
            role: "CTO", 
            description: "Robotics specialist leading our R&D team in developing cutting-edge drone systems.",
            imageUrl: "src/assets/tatpar.jpg"
          },
          {
            name: "Rahul Mehta",
            role: "Head of Operations",
            description: "Business strategist ensuring seamless service delivery and client satisfaction.",
            imageUrl: "https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
          }
        ]
      });
    }
    
    res.status(200).json(aboutData);
  } catch (err) {
    console.error('Error fetching about data:', err);
    res.status(500).json({ 
      error: 'Failed to fetch about page data',
      details: err.message 
    });
  }
});

// POST /api/about - Update or create about page data
router.post('/', upload.fields([
  { name: 'heroBackgroundImage', maxCount: 1 },
  { name: 'storyImage', maxCount: 1 },
  { name: 'teamImages', maxCount: 10 }
]), async (req, res) => {
  try {
    const {
      heroTitle,
      heroSubtitle,
      story,
      values,
      team
    } = req.body;

    console.log('Received files:', req.files); // Debug log
    console.log('Request body:', req.body); // Debug log

    // Parse JSON strings if they come as strings
    const parsedStory = typeof story === 'string' ? JSON.parse(story) : story;
    const parsedValues = typeof values === 'string' ? JSON.parse(values) : values;
    const parsedTeam = typeof team === 'string' ? JSON.parse(team) : team;

    // Get existing about data to preserve current images if no new ones uploaded
    const existingAbout = await About.findOne();

    const updateData = {
      heroTitle,
      heroSubtitle,
      story: parsedStory,
      values: parsedValues,
      team: parsedTeam,
      // Preserve existing images as default
      heroBackgroundImage: existingAbout?.heroBackgroundImage || "https://images.pexels.com/photos/442584/pexels-photo-442584.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
      storyImage: existingAbout?.storyImage || "https://images.pexels.com/photos/1087180/pexels-photo-1087180.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
    };

    // Handle hero background image upload
    if (req.files && req.files.heroBackgroundImage && req.files.heroBackgroundImage.length > 0) {
      updateData.heroBackgroundImage = req.files.heroBackgroundImage[0].path; // Use .path for Cloudinary URL
      console.log('Hero image uploaded:', updateData.heroBackgroundImage);
    }

    // Handle story image upload
    if (req.files && req.files.storyImage && req.files.storyImage.length > 0) {
      updateData.storyImage = req.files.storyImage[0].path; // Use .path for Cloudinary URL
      console.log('Story image uploaded:', updateData.storyImage);
    }

    // Handle team member images
    if (req.files && req.files.teamImages && req.files.teamImages.length > 0) {
      const teamImages = req.files.teamImages;
      updateData.team = updateData.team.map((member, index) => {
        if (teamImages[index]) {
          return {
            ...member,
            imageUrl: teamImages[index].path // Use .path for Cloudinary URL
          };
        }
        return member;
      });
      console.log('Team images uploaded:', teamImages.map(img => img.path));
    }

    if (existingAbout) {
      const updatedAbout = await About.findByIdAndUpdate(
        existingAbout._id,
        updateData,
        { new: true }
      );
      res.status(200).json({
        message: 'About page updated successfully',
        about: updatedAbout
      });
    } else {
      const newAbout = new About(updateData);
      const savedAbout = await newAbout.save();
      res.status(201).json({
        message: 'About page created successfully',
        about: savedAbout
      });
    }
  } catch (err) {
    console.error('Error updating about page:', err);
    res.status(500).json({
      error: 'Failed to update about page',
      details: err.message
    });
  }
});

// PUT /api/about/hero - Update hero section only
router.put('/hero', upload.single('heroBackgroundImage'), async (req, res) => {
  try {
    const { heroTitle, heroSubtitle } = req.body;
    
    const existingAbout = await About.findOne();
    if (!existingAbout) {
      return res.status(404).json({ error: 'About page not found' });
    }

    const updateData = {
      heroTitle,
      heroSubtitle
    };

    // Only update image if a new one is uploaded
    if (req.file) {
      updateData.heroBackgroundImage = req.file.path; // Use .path for Cloudinary URL
      console.log('Hero image updated:', updateData.heroBackgroundImage);
    }

    const updatedAbout = await About.findByIdAndUpdate(
      existingAbout._id,
      updateData,
      { new: true }
    );

    res.status(200).json({
      message: 'Hero section updated successfully',
      about: updatedAbout
    });
  } catch (err) {
    console.error('Error updating hero section:', err);
    res.status(500).json({
      error: 'Failed to update hero section',
      details: err.message
    });
  }
});

// PUT /api/about/story - Update story section only
router.put('/story', upload.single('storyImage'), async (req, res) => {
  try {
    const { story } = req.body;
    
    const existingAbout = await About.findOne();
    if (!existingAbout) {
      return res.status(404).json({ error: 'About page not found' });
    }

    const updateData = {
      story: typeof story === 'string' ? JSON.parse(story) : story
    };

    // Only update image if a new one is uploaded
    if (req.file) {
      updateData.storyImage = req.file.path; // Use .path for Cloudinary URL
      console.log('Story image updated:', updateData.storyImage);
    }

    const updatedAbout = await About.findByIdAndUpdate(
      existingAbout._id,
      updateData,
      { new: true }
    );

    res.status(200).json({
      message: 'Story section updated successfully',
      about: updatedAbout
    });
  } catch (err) {
    console.error('Error updating story section:', err);
    res.status(500).json({
      error: 'Failed to update story section',
      details: err.message
    });
  }
});

// PUT /api/about/values - Update values section only
router.put('/values', async (req, res) => {
  try {
    const { values } = req.body;
    
    const updateData = {
      values: typeof values === 'string' ? JSON.parse(values) : values
    };

    const existingAbout = await About.findOne();
    if (!existingAbout) {
      return res.status(404).json({ error: 'About page not found' });
    }

    const updatedAbout = await About.findByIdAndUpdate(
      existingAbout._id,
      updateData,
      { new: true }
    );

    res.status(200).json({
      message: 'Values section updated successfully',
      about: updatedAbout
    });
  } catch (err) {
    console.error('Error updating values section:', err);
    res.status(500).json({
      error: 'Failed to update values section',
      details: err.message
    });
  }
});

// PUT /api/about/team - Update team section only
router.put('/team', teamUpload.array('teamImages', 10), async (req, res) => {
  try {
    const { team } = req.body;
    
    let parsedTeam = typeof team === 'string' ? JSON.parse(team) : team;

    // Handle team member images
    if (req.files && req.files.length > 0) {
      parsedTeam = parsedTeam.map((member, index) => {
        if (req.files[index]) {
          return {
            ...member,
            imageUrl: req.files[index].path // Use .path for Cloudinary URL
          };
        }
        return member;
      });
      console.log('Team images updated:', req.files.map(img => img.path));
    }

    const updateData = { team: parsedTeam };

    const existingAbout = await About.findOne();
    if (!existingAbout) {
      return res.status(404).json({ error: 'About page not found' });
    }

    const updatedAbout = await About.findByIdAndUpdate(
      existingAbout._id,
      updateData,
      { new: true }
    );

    res.status(200).json({
      message: 'Team section updated successfully',
      about: updatedAbout
    });
  } catch (err) {
    console.error('Error updating team section:', err);
    res.status(500).json({
      error: 'Failed to update team section',
      details: err.message
    });
  }
});

// POST /api/about/team/member - Add new team member
router.post('/team/member', teamUpload.single('image'), async (req, res) => {
  try {
    const { name, role, description } = req.body;
    
    const newMember = {
      name,
      role,
      description,
      imageUrl: req.file ? req.file.path : '' // Use .path for Cloudinary URL
    };

    const existingAbout = await About.findOne();
    if (!existingAbout) {
      return res.status(404).json({ error: 'About page not found' });
    }

    existingAbout.team.push(newMember);
    const updatedAbout = await existingAbout.save();

    res.status(201).json({
      message: 'Team member added successfully',
      about: updatedAbout
    });
  } catch (err) {
    console.error('Error adding team member:', err);
    res.status(500).json({
      error: 'Failed to add team member',
      details: err.message
    });
  }
});

// DELETE /api/about/team/member/:index - Remove team member by index
router.delete('/team/member/:index', async (req, res) => {
  try {
    const memberIndex = parseInt(req.params.index);
    
    const existingAbout = await About.findOne();
    if (!existingAbout) {
      return res.status(404).json({ error: 'About page not found' });
    }

    if (memberIndex < 0 || memberIndex >= existingAbout.team.length) {
      return res.status(400).json({ error: 'Invalid team member index' });
    }

    existingAbout.team.splice(memberIndex, 1);
    const updatedAbout = await existingAbout.save();

    res.status(200).json({
      message: 'Team member removed successfully',
      about: updatedAbout
    });
  } catch (err) {
    console.error('Error removing team member:', err);
    res.status(500).json({
      error: 'Failed to remove team member',
      details: err.message
    });
  }
});

module.exports = router;