const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: [
      'Bitcoin', 'Ethereum', 'Usdt(Trc20)', 'Usdt(Erc20)', 
      'Dogecoin', 'Litecoin', 'Solana', 'Stellar', 
      'Ripple', 'Shiba', 'Cardano', 'Polkadot'
    ]
  },
  symbol: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    default: 0
  },
  amount: {
    type: Number,
    default: 0
  }
});

const portfolioSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assets: [assetSchema]
}, {
  timestamps: true
});

// Create unique index for user
portfolioSchema.index({ user: 1 }, { unique: true });

module.exports = mongoose.model('Portfolio', portfolioSchema);