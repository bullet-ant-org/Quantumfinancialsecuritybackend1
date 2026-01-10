const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  broadcastNotification,
  createRequestNotification,
  sendToSpecificUser,
  findUserWallet
} = require("../controllers/notificationController");
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.route('/')
  .get(auth, getNotifications);

router.route('/unread-count').get(auth, getUnreadCount);
router.route('/read-all').put(auth, markAllAsRead);
router.route('/create-request').post(auth, createRequestNotification);
router.route('/broadcast').post(auth, admin, broadcastNotification);
router.route('/send-to-user').post(auth, admin, sendToSpecificUser);
router.route('/:id/read').put(auth, markAsRead);
router.route('/:id').delete(auth, deleteNotification);

// This route is used by the UserSend page to find a user's wallet address.
router.route('/users/find').post(auth, findUserWallet);

module.exports = router;