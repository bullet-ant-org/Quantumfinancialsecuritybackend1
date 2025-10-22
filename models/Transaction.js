const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdraw', 'send', 'request'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  method: {
    type: String,
    required: function() {
      return this.type === 'deposit' || this.type === 'withdraw';
    }
  },
  remarks: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type === 'send' || this.type === 'request';
    }
  },
  recipientEmail: String,
  recipientUsername: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);