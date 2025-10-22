const express = require('express');
const router = express.Router();
const { createDispute } = require('../controllers/disputeController');
const auth = require('../middleware/auth'); // Assuming you have this auth middleware

// POST /api/disputes
router.route('/').post(auth, createDispute);

module.exports = router;