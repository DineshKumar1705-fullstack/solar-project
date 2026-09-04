const Engineer = require('../models/Engineer');

const getAllEngineers = async (req, res) => {
  try {
    const engineers = await Engineer.findAll({
      order: [['Name', 'ASC']]
    });
    res.status(200).json(engineers);
  } catch (err) {
    console.error('Error fetching engineers:', err);
    res.status(500).json({ error: 'Failed to fetch engineers' });
  }
};

module.exports = {
  getAllEngineers
};
