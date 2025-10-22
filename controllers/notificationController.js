const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get all notifications for a user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, user: req.user.id });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.deleteOne();

    res.json({ message: 'Notification removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get unread notification count for a user
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user.id, read: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a notification for all users (broadcast)
// @route   POST /api/notifications/broadcast
// @access  Private/Admin
exports.broadcastNotification = async (req, res) => {
  const { title, message, type } = req.body;

  if (!title || !message || !type) {
    return res.status(400).json({ message: 'Title, message, and type are required.' });
  }

  try {
    const users = await User.find({}).select('_id');
    const notifications = users.map(user => ({ user: user._id, title, message, type }));

    await Notification.insertMany(notifications);

    res.status(201).json({ message: 'Notification sent to all users successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};