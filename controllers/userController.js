const User = require('../models/User');
const SecretPhrase = require('../models/SecretPhrase');
const Portfolio = require('../models/Portfolio'); // Import the Portfolio model
const { ethers } = require('ethers');

exports.getUsers = async (req, res) => {
  try {
    // The populate can fail if a user's portfolio field is null or references a deleted portfolio.
    // It's safer to fetch users and then populate portfolios separately if needed,
    // but for this case, we'll keep it simple and just ensure the query is robust.
    // A simple populate should generally not fail on null, but let's ensure the query is solid.
    const users = await User.find()
      .select('-password')
      .lean(); // Using .lean() can improve performance for read-only operations.
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching users',
      error: error.message
    });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Users can only view their own profile unless admin
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching user',
      error: error.message
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    // Users can only update their own profile unless admin
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating user',
      error: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting user',
      error: error.message
    });
  }
};

exports.updateCardStatus = async (req, res) => {
  try {
    const { cardStatus } = req.body;

    if (!['None', 'Bronze', 'Silver', 'Gold'].includes(cardStatus)) {
      return res.status(400).json({
        message: 'Invalid card status'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { cardStatus },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating card status',
      error: error.message
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    // The user's ID is available from the `auth` middleware
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error changing password', error: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    // req.user is attached by the auth middleware
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.username = req.body.username || user.username;
      user.fullName = req.body.fullName || user.fullName;
      // Email is typically not updated this way without verification

      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Connect wallet from phrase
// @route   POST /api/users/connect-wallet-from-phrase
// @access  Private
exports.connectWalletFromPhrase = async (req, res) => {
  const { phrase, name } = req.body;

  if (!phrase || typeof phrase !== 'string' || phrase.trim().split(/\s+/).length < 12) {
    return res.status(400).json({ message: 'A valid secret phrase of at least 12 words is required.' });
  }

  try {
    // Use ethers to reliably derive the wallet from the mnemonic phrase
    const wallet = ethers.Wallet.fromPhrase(phrase.trim());
    const address = wallet.address;

    // Save/update the secret phrase in its own collection
    await SecretPhrase.findOneAndUpdate(
      { user: req.user.id },
      { user: req.user.id, phrase: phrase.trim(), name: name || 'My Wallet' },
      { upsert: true, new: true }
    );

    // Save the public address to the user's profile
    const user = await User.findById(req.user.id);
    user.walletAddress = address;
    const updatedUser = await user.save();

    // Return the updated user object so the frontend can update local storage
    const userObject = updatedUser.toObject();
    delete userObject.password;
    res.json(userObject);
  } catch (error) {
    if (error.message && error.message.includes('invalid mnemonic')) {
      return res.status(400).json({ message: 'Invalid secret phrase. Please ensure it is correct and try again.', error: error.message });
    } else {
      console.error('Error in connectWalletFromPhrase:', error);
      res.status(500).json({ message: 'Failed to derive wallet from phrase. An unexpected server error occurred.', error: error.message });
    }
  }
};

// @desc    Apply for a card and update user's card status
// @route   POST /api/users/apply-card
// @access  Private
exports.applyForCard = async (req, res) => {
  const { cardStatus } = req.body;
  const validStatuses = ['Bronze', 'Silver', 'Gold'];

  if (!cardStatus || !validStatuses.includes(cardStatus)) {
    return res.status(400).json({ message: 'Invalid card status provided.' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.cardStatus = cardStatus;
    await user.save();

    res.json({ message: `Successfully applied for ${cardStatus} card.`, user });

  } catch (error) {
    res.status(500).json({ message: 'Server error while applying for card.', error: error.message });
  }
};

// @desc    Connect wallet addresses to user profile
// @route   PUT /api/users/connect-wallet
// @access  Private
exports.connectWallet = async (req, res) => {
  try {
    const { stellarAddress, rippleAddress } = req.body;
    if (!stellarAddress && !rippleAddress) {
      return res.status(400).json({ message: 'At least one wallet address is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (stellarAddress) user.stellarAddress = stellarAddress;
    if (rippleAddress) user.rippleAddress = rippleAddress;

    const updatedUser = await user.save();
    res.json(updatedUser.toObject({ virtuals: true }));
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Find user by username or email for sending
// @route   POST /api/users/find
// @access  Private
exports.findUser = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier || typeof identifier !== 'string' || identifier.trim().length === 0) {
      return res.status(400).json({ message: 'Identifier (username or email) is required' });
    }

    // Find user by username or email (case insensitive)
    const user = await User.findOne({
      $or: [
        { username: new RegExp(`^${identifier.trim()}$`, 'i') },
        { email: new RegExp(`^${identifier.trim()}$`, 'i') }
      ]
    }).select('username email stellarAddress rippleAddress fullName');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow users to find themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot send to yourself' });
    }

    res.json({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      walletAddress: user.stellarAddress || user.rippleAddress // Return the first available address
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getAdminUserStats = async (req, res) => {
  try {
    const users = await User.find({});

    // Calculate totals
    const totalUsers = users.length;

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
      totalUsers,
      monthlyRegistrations,
      cardStatusCounts
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching admin user stats',
      error: error.message
    });
  }
};
