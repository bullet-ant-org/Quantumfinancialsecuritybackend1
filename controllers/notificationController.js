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

// @desc    Create a money request notification
// @route   POST /api/notifications/create-request
// @access  Private
exports.createRequestNotification = async (req, res) => {
  const { recipientIdentifier, amount } = req.body;

  if (!recipientIdentifier || !amount) {
    return res.status(400).json({ message: 'Recipient and amount are required.' });
  }

  try {
    // Find recipient by username or email
    const recipient = await User.findOne({
      $or: [{ email: recipientIdentifier }, { username: recipientIdentifier }],
    }).select('_id');

    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found.' });
    }

    const notification = await Notification.create({
      user: recipient._id,
      title: 'Money Request',
      message: `${req.user.username} is requesting $${amount} from you.`,
      type: 'request',
      relatedUser: req.user.id, // Add the user who initiated the request
      amount: amount, // Include the amount
    });

    res.status(201).json({ message: 'Money request notification sent successfully', notification });
  } catch (error) {
    console.error('Error creating request notification:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
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

// @desc    Send a notification to a specific user
// @route   POST /api/notifications/send-to-user
// @access  Private/Admin
exports.sendToSpecificUser = async (req, res) => {
  const { recipientIdentifier, title, message, type } = req.body;

  if (!recipientIdentifier || !title || !message || !type) {
    return res.status(400).json({ message: 'Recipient, title, message, and type are required.' });
  }

  try {
    // Find recipient by username or email
    const recipient = await User.findOne({
      $or: [{ email: recipientIdentifier }, { username: recipientIdentifier }],
    }).select('_id');

    if (!recipient) {
      return res.status(404).json({ message: 'Recipient user not found.' });
    }

    await Notification.create({ user: recipient._id, title, message, type });

    res.status(201).json({ message: `Notification sent successfully to ${recipientIdentifier}` });
  } catch (error) {
    console.error('Error sending specific notification:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Find a user by username/email and return their wallet address
// @route   POST /api/users/find
// @access  Private
exports.findUserWallet = async (req, res) => {
  const { identifier } = req.body;

  if (!identifier) {
    return res.status(400).json({ message: 'Recipient identifier is required.' });
  }

  try {
    const recipient = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).select('username walletAddress');

    if (!recipient) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!recipient.walletAddress) {
      return res.status(404).json({ message: 'This user has not connected a wallet address yet.' });
    }

    res.json({ username: recipient.username, walletAddress: recipient.walletAddress });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};