const express = require('express');
const router = express.Router();
const { getPlatformStats, getAdminDashboardStats, getRealtimeStats } = require('../controllers/statsController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/platform', getPlatformStats);
router.get('/admin-dashboard', [auth, admin], getAdminDashboardStats);
router.get('/realtime', [auth, admin], getRealtimeStats);

module.exports = router;
