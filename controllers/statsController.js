const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Transaction = require('../models/Transaction');

// @desc    Get platform-wide statistics for landing page
// @route   GET /api/stats/platform
// @access  Public
exports.getPlatformStats = async (req, res) => {
  try {
    const usersEnrolled = 170000;
    const humanitarianProjects = 2000;
    const totalAssetCap = 76000000;
    res.json({ usersEnrolled, totalAssetCap, humanitarianProjects });
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching platform stats.' });
  }
};

// @desc    Get all data for the admin dashboard
// @route   GET /api/stats/admin-dashboard
// @access  Private/Admin
exports.getAdminDashboardStats = async (req, res) => {
  try {
    const users = await User.find({});
    const recentTickets = await Ticket.find({}).sort({ createdAt: -1 }).limit(5).populate('user', 'username');
    const recentTransactions = await Transaction.find({}).sort({ createdAt: -1 }).limit(5).populate('user', 'username');

    // Process user data for charts
    const monthlyRegistrations = new Array(12).fill(0);
    const cardStatusCounts = { 'None': 0, 'Bronze': 0, 'Silver': 0, 'Gold': 0 };

    users.forEach(user => {
      const month = new Date(user.createdAt).getMonth();
      monthlyRegistrations[month]++;
      const status = user.cardStatus || 'None';
      if (cardStatusCounts.hasOwnProperty(status)) {
        cardStatusCounts[status]++;
      }
    });

    res.json({
      monthlyRegistrations,
      cardStatusCounts,
      recentTransactions,
      recentTickets,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching admin dashboard stats.', error: error.message });
  }
};