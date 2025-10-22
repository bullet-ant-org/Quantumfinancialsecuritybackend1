const mongoose = require('mongoose');

const SecretPhraseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    default: 'My Wallet',
  },
  phrase: {
    type: String, // In a real-world high-security app, this should be encrypted.
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('SecretPhrase', SecretPhraseSchema);