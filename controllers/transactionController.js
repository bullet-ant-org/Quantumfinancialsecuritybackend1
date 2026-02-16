const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { default: mongoose } = require('mongoose');

exports.getTransactions = async (req, res) => {
  try {
    console.log('Fetching transactions for user:', req.user.id);
    
    const transactions = await Transaction.find({ user: req.user.id })
      .populate('recipient', 'username email')
      .sort({ createdAt: -1 });

    console.log('Found transactions:', transactions);
    
    res.json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      message: 'Error fetching transactions',
      error: error.message
    });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({})
      .populate('user', 'username email')
      .populate('recipient', 'username email')
      .sort({ createdAt: -1 });

    const totalTransactions = transactions.length;
    const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    res.json({
      success: true,
      totalTransactions,
      totalRevenue,
      transactions
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching all transactions',
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
    const { amount, senderIdentifier, currency, remarks } = req.body; // Changed recipientEmail/Username to senderIdentifier, added currency

    // Find the sender (the one being requested from)
    const sender = await User.findOne({
      $or: [
        { email: senderIdentifier },
        { username: senderIdentifier }
      ]
    });

    if (!sender) {
      return res.status(404).json({
        message: 'Sender not found'
      });
    }

    // The requester is the current authenticated user (req.user.id)
    const transaction = await Transaction.create({
      user: req.user.id, // Transaction belongs to the requester
      type: 'request',
      amount,
      currency, // Store the currency for the request
      recipient: sender._id, // The recipient of the request (who will send the funds)
      recipientUsername: sender.username, // Store recipient's username for display
      recipientEmail: sender.email, // Store recipient's email for display
      senderIdentifier: senderIdentifier, // Store the identifier of the person being requested from
      status: 'pending' // Requests are pending until fulfilled
    });

    console.log('Created request transaction:', transaction);
    
    res.status(201).json({
      success: true,
      message: `Request for ${amount} ${currency} sent successfully to ${senderIdentifier}`,
      transaction
    });
  } catch (error) {
    console.error('Error requesting money:', error);
    res.status(500).json({
      message: 'Error requesting money',
      error: error.message
    });
  }
};

exports.sendCrypto = async (req, res) => {
  try {
    const { amount, recipientIdentifier, currency, remarks } = req.body;

    // Find recipient
    const recipient = await User.findOne({
      $or: [
        { email: recipientIdentifier },
        { username: recipientIdentifier }
      ]
    });

    if (!recipient) {
      return res.status(404).json({
        message: 'Recipient not found'
      });
    }

    // Check if recipient has the appropriate wallet address
    let recipientAddress;
    if (currency === 'XLM' || currency === 'USDT') {
      if (!recipient.stellarAddress) {
        return res.status(400).json({
          message: 'Recipient has not connected a Stellar wallet'
        });
      }
      recipientAddress = recipient.stellarAddress;
    } else if (currency === 'XRP') {
      if (!recipient.rippleAddress) {
        return res.status(400).json({
          message: 'Recipient has not connected a Ripple wallet'
        });
      }
      recipientAddress = recipient.rippleAddress;
    } else {
      return res.status(400).json({
        message: 'Unsupported currency'
      });
    }

    // Get sender's secret phrase
    const SecretPhrase = require('../models/SecretPhrase');
    const secretPhrase = await SecretPhrase.findOne({ user: req.user.id });
    if (!secretPhrase) {
      return res.status(400).json({
        message: 'Sender has not set up a secret phrase'
      });
    }

    // Check balance
    const cryptoService = require('../config/cryptoService');
    let balance;
    if (currency === 'XLM') {
      const user = await User.findById(req.user.id);
      if (!user.stellarAddress) {
        return res.status(400).json({
          message: 'Sender has not connected a Stellar wallet'
        });
      }
      balance = await cryptoService.getStellarBalance(user.stellarAddress);
    } else if (currency === 'XRP') {
      const user = await User.findById(req.user.id);
      if (!user.rippleAddress) {
        return res.status(400).json({
          message: 'Sender has not connected a Ripple wallet'
        });
      }
      balance = await cryptoService.getRippleBalance(user.rippleAddress);
    } else if (currency === 'USDT') {
      // Assume USDT on Stellar for now
      const user = await User.findById(req.user.id);
      if (!user.stellarAddress) {
        return res.status(400).json({
          message: 'Sender has not connected a Stellar wallet'
        });
      }
      balance = await cryptoService.getStellarBalance(user.stellarAddress);
      // Note: This is simplified; USDT balance check would need asset balance
    } else {
      return res.status(400).json({
        message: 'Unsupported currency'
      });
    }

    if (!balance || balance.quantity < amount) {
      return res.status(400).json({
        message: 'Insufficient balance'
      });
    }

    // Send crypto
    let sendResult;
    if (currency === 'XLM' || currency === 'USDT') {
      sendResult = await cryptoService.sendStellar(secretPhrase.phrase, recipientAddress, amount);
    } else if (currency === 'XRP') {
      sendResult = await cryptoService.sendRipple(secretPhrase.phrase, recipientAddress, amount);
    }

    // Log transaction
    const transaction = await Transaction.create({
      user: req.user.id,
      type: 'send',
      amount,
      currency,
      recipient: recipient._id,
      recipientEmail: recipient.email,
      recipientUsername: recipient.username,
      remarks,
      status: 'completed'
    });

    res.status(201).json({
      success: true,
      message: `${currency} sent successfully`,
      transaction,
      transactionHash: sendResult.transactionHash
    });
  } catch (error) {
    console.error('Error sending crypto:', error);
    res.status(500).json({
      message: 'Error sending crypto',
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
