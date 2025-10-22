const User = require('../models/User');
const SecretPhrase = require('../models/SecretPhrase');
const { ethers } = require('ethers');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('portfolio');
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

// @desc    Connect a wallet from a secret phrase
// @route   POST /api/users/connect-wallet-phrase
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
    console.error('Error in connectWalletFromPhrase:', error);
    res.status(500).json({ message: 'Failed to derive wallet from phrase. Please ensure the phrase is correct.', error: error.message });
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

// @desc    Connect a wallet address to user profile
// @route   PUT /api/users/connect-wallet
// @access  Private
exports.connectWallet = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.walletAddress = walletAddress;
    const updatedUser = await user.save();
    res.json(updatedUser.toObject({ virtuals: true }));
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};