const express = require('express');
const router = express.Router();
const { getPortfolio } = require('../controllers/portfolioController');
const auth = require('../middleware/auth');

router.get('/', auth, getPortfolio);

module.exports = router;