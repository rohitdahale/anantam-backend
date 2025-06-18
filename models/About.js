const mongoose = require('mongoose');

const aboutSchema = new mongoose.Schema({
  // Hero Section
  heroTitle: {
    type: String,
    default: "About Anantam Aerials and Robotics"
  },
  heroSubtitle: {
    type: String,
    default: "Pioneering advanced aerial solutions for a connected future."
  },
  heroBackgroundImage: {
    type: String,
    default: "https://images.pexels.com/photos/442584/pexels-photo-442584.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
  },
  
  // Story Section
  story: [{
    type: String,
    required: true
  }],
  storyImage: {
    type: String,
    default: "https://images.pexels.com/photos/1087180/pexels-photo-1087180.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
  },
  
  // Values Section
  values: [{
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      required: true,
      enum: ['Zap', 'Award', 'Target', 'Users', 'Shield', 'Globe', 'Heart', 'Star']
    }
  }],
  
  // Team Section
  team: [{
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    imageUrl: {
      type: String,
      required: true
    }
  }]
}, { 
  timestamps: true,
  collection: 'about' // Ensure collection name is consistent
});

// Add index for better query performance
aboutSchema.index({ createdAt: -1 });

// Pre-save middleware to ensure only one document exists
aboutSchema.pre('save', async function(next) {
  if (this.isNew) {
    const existingDoc = await this.constructor.findOne();
    if (existingDoc && !existingDoc._id.equals(this._id)) {
      const error = new Error('Only one About page document is allowed');
      return next(error);
    }
  }
  next();
});

// Static method to get or create the about page
aboutSchema.statics.getOrCreate = async function() {
  let aboutData = await this.findOne();
  
  if (!aboutData) {
    aboutData = await this.create({
      heroTitle: "About Anantam Aerials and Robotics",
      heroSubtitle: "Pioneering advanced aerial solutions for a connected future.",
      story: [
        "Founded in 2021, Anantam Aerials and Robotics was born from a passion for innovation and a vision to transform industries through advanced drone technology. What began as a small team of enthusiasts has grown into a leading provider of comprehensive aerial solutions.",
        "Our journey started with a simple mission: to make cutting-edge aerial technology accessible to businesses across sectors. Today, we serve clients ranging from construction and agriculture to filmmaking and emergency services.",
        "With a team of skilled engineers, designers, and industry experts, we continue to push the boundaries of what's possible in the drone ecosystem, constantly evolving our offerings to meet the changing needs of our clients."
      ],
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
  
  return aboutData;
};

// Instance method to safely update sections
aboutSchema.methods.updateSection = function(section, data) {
  if (this[section] !== undefined) {
    this[section] = data;
    return this.save();
  }
  throw new Error(`Section '${section}' does not exist`);
};

module.exports = mongoose.model('About', aboutSchema);