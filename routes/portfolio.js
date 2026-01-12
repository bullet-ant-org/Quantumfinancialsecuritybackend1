const express = require('express');
const router = express.Router();
const { getPortfolio, getTotalPortfolioValue } = require('../controllers/portfolioController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/', auth, getPortfolio);
router.get('/admin/total-value', [auth, admin], getTotalPortfolioValue);

module.exports = router;
