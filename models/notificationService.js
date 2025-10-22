const Notification = require('../models/Notification');

/**
 * Creates a new notification for a user.
 * @param {string} userId - The ID of the user to notify.
 * @param {object} notificationData - The notification data.
 * @param {string} notificationData.type - The type of the notification (e.g., 'success', 'alert').
 * @param {string} notificationData.title - The title of the notification.
 * @param {string} notificationData.message - The notification message.
 */
const createNotification = async (userId, { type, title, message }) => {
  try {
    const notification = new Notification({ user: userId, type, title, message });
    await notification.save();
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

module.exports = { createNotification };