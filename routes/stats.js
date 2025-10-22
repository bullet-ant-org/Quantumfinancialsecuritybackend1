const express = require('express');
const router = express.Router();
const { getPlatformStats, getAdminDashboardStats } = require('../controllers/statsController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/platform', getPlatformStats);
router.get('/admin-dashboard', [auth, admin], getAdminDashboardStats);

module.exports = router;