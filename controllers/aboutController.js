const About = require('../models/About');

exports.getAbout = async (req, res) => {
  try {
    const about = await About.findOne();
    res.json(about);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateAbout = async (req, res) => {
  try {
    const { heroTitle, heroSubtitle, ourStory, values, team } = req.body;
    let about = await About.findOne();
    if (!about) {
      about = new About({ heroTitle, heroSubtitle, ourStory, values, team });
    } else {
      about.heroTitle = heroTitle;
      about.heroSubtitle = heroSubtitle;
      about.ourStory = ourStory;
      about.values = values;
      about.team = team;
    }

    await about.save();
    res.json(about);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
