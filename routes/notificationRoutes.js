const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  broadcastNotification
} = require("../controllers/notificationController");
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.route('/')
  .get(auth, getNotifications);

router.route('/unread-count').get(auth, getUnreadCount);
router.route('/read-all').put(auth, markAllAsRead);
router.route('/broadcast').post(auth, admin, broadcastNotification);
router.route('/:id/read').put(auth, markAsRead);
router.route('/:id').delete(auth, deleteNotification);

module.exports = router;