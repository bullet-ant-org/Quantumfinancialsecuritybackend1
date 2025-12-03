const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { default: mongoose } = require('mongoose');

exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .populate('recipient', 'username email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching transactions',
      error: error.message
    });
  }
};

exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('recipient', 'username email');

    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching transaction',
      error: error.message
    });
  }
};

exports.deposit = async (req, res) => {
  try {
    const { amount, method, remarks } = req.body;

    const transaction = await Transaction.create({
      user: req.user.id,
      type: 'deposit',
      amount,
      method,
      remarks,
      status: 'completed'
    });

    // Update user balance
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { balance: amount }
    });

    res.status(201).json({
      success: true,
      message: 'Deposit successful',
      transaction
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error processing deposit',
      error: error.message
    });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const { amount, method, remarks } = req.body;

    // Check if user has sufficient balance
    const user = await User.findById(req.user.id);
    if (user.balance < amount) {
      return res.status(400).json({
        message: 'Insufficient balance'
      });
    }

    const transaction = await Transaction.create({
      user: req.user.id,
      type: 'withdraw',
      amount,
      method,
      remarks,
      status: 'completed'
    });

    // Update user balance
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { balance: -amount }
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal successful',
      transaction
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error processing withdrawal',
      error: error.message
    });
  }
};

exports.sendMoney = async (req, res) => {
  try {
    const { amount, recipientEmail, recipientUsername, remarks } = req.body;

    // Find recipient
    const recipient = await User.findOne({
      $or: [
        { email: recipientEmail },
        { username: recipientUsername }
      ]
    });

    if (!recipient) {
      return res.status(404).json({
        message: 'Recipient not found'
      });
    }

    // Check if sender has sufficient balance
    const sender = await User.findById(req.user.id);
    if (sender.balance < amount) {
      return res.status(400).json({
        message: 'Insufficient balance'
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      user: req.user.id,
      type: 'send',
      amount,
      recipient: recipient._id,
      recipientEmail: recipient.email,
      recipientUsername: recipient.username,
      remarks,
      status: 'completed'
    });

    // Update balances
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { balance: -amount }
    });

    await User.findByIdAndUpdate(recipient._id, {
      $inc: { balance: amount }
    });

    res.status(201).json({
      success: true,
      message: 'Money sent successfully',
      transaction
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error sending money',
      error: error.message
    });
  }
};

exports.requestMoney = async (req, res) => {
  try {
    const { amount, recipientEmail, recipientUsername, remarks } = req.body;

    // Find recipient
    const recipient = await User.findOne({
      $or: [
        { email: recipientEmail },
        { username: recipientUsername }
      ]
    });

    if (!recipient) {
      return res.status(404).json({
        message: 'Recipient not found'
      });
    }

    const transaction = await Transaction.create({
      user: req.user.id,
      type: 'request',
      amount,
      recipient: recipient._id,
      recipientEmail: recipient.email,
      recipientUsername: recipient.username,
      remarks,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Money request sent successfully',
      transaction
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error requesting money',
      error: error.message
    });
  }
};

exports.getUserPortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.params.userId });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    res.json({
      success: true,
      portfolio
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching user portfolio',
      error: error.message
    });
  }
};