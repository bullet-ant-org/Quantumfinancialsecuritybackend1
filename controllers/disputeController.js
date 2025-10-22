const Dispute = require('../models/Dispute');
const Transaction = require('../models/Transaction');

// @desc    Create a new dispute
// @route   POST /api/disputes
// @access  Private
exports.createDispute = async (req, res) => {
  try {
    const { transactionId, title, priority, description } = req.body;

    // 1. Validation
    if (!transactionId || !title || !description) {
      return res.status(400).json({ message: 'Transaction ID, title, and description are required.' });
    }

    // 2. Verify transaction exists (optional but recommended)
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    // 3. Create and save the new dispute
    const dispute = new Dispute({
      user: req.user.id, // Assumes auth middleware attaches user to req
      transaction: transactionId,
      title,
      priority: priority || 'medium',
      description,
      status: 'open', // Default status
    });

    const createdDispute = await dispute.save();

    res.status(201).json(createdDispute);

  } catch (error) {
    console.error('Error creating dispute:', error);
    // Provide a generic but helpful error message
    res.status(500).json({ message: 'Server error while creating dispute. Please try again later.' });
  }
};

// @desc    Get all disputes for a user or all disputes if admin
// @route   GET /api/disputes
// @access  Private
exports.getDisputes = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { user: req.user.id };
    const disputes = await Dispute.find(query).populate('user', 'username').populate('transaction').sort({ createdAt: -1 });
    res.json(disputes);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get a single dispute by ID
// @route   GET /api/disputes/:id
// @access  Private
exports.getDispute = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id).populate('user', 'username fullName').populate('transaction');

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Ensure user owns the dispute or is an admin
    if (dispute.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(dispute);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a dispute
// @route   PUT /api/disputes/:id
// @access  Private
exports.updateDispute = async (req, res) => {
  try {
    const { title, description, priority } = req.body;
    let dispute = await Dispute.findById(req.params.id);

    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });
    if (dispute.user.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

    dispute = await Dispute.findByIdAndUpdate(req.params.id, { title, description, priority }, { new: true });
    res.json(dispute);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Resolve a dispute
// @route   PATCH /api/disputes/:id/resolve
// @access  Private/Admin
exports.resolveDispute = async (req, res) => {
  try {
    const dispute = await Dispute.findByIdAndUpdate(req.params.id, { status: 'resolved', resolvedBy: req.user.id, resolvedAt: Date.now() }, { new: true });
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });
    res.json(dispute);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};