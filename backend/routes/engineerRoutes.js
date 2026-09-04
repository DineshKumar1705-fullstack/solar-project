const express = require('express');
const router = express.Router();
const { getAllEngineers } = require('../controllers/engineerController');

router.get('/engineers', getAllEngineers);

module.exports = router;
