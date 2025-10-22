const SecretPhrase = require('../models/SecretPhrase');

// @desc    Get secret phrase for a specific user
// @route   GET /api/secretphrases/user/:userId
// @access  Private/Admin
exports.getSecretPhraseForUser = async (req, res) => {
  try {
    const secretPhrase = await SecretPhrase.findOne({ user: req.params.userId }).populate('user', 'username email');

    if (!secretPhrase) {
      return res.status(404).json({ message: 'Secret phrase not found for this user.' });
    }

    res.json(secretPhrase);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all secret phrases
// @route   GET /api/secretphrases
// @access  Private/Admin
exports.getAllSecretPhrases = async (req, res) => {
    try {
        const phrases = await SecretPhrase.find({}).populate('user', 'username email');
        res.json(phrases);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create or update a secret phrase for the logged-in user
// @route   POST /api/secretphrases
// @access  Private
exports.createOrUpdateSecretPhrase = async (req, res) => {
  try {
    const { name, phrase } = req.body;
    if (!name || !phrase) {
      return res.status(400).json({ message: 'Name and phrase are required.' });
    }

    const secretPhrase = await SecretPhrase.findOneAndUpdate(
      { user: req.user.id },
      { user: req.user.id, name, phrase },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({
      message: 'Secret phrase saved successfully.',
      secretPhrase,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error saving secret phrase', error: error.message });
  }
};