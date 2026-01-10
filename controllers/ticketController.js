const Ticket = require('../models/Ticket');

exports.getTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user.id })
      .populate('user', 'username email')
      .populate('assignedTo', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tickets.length,
      tickets
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching tickets',
      error: error.message
    });
  }
};

exports.getAdminTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate('user', 'username email')
      .populate('assignedTo', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tickets.length,
      tickets
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching tickets',
      error: error.message
    });
  }
};

exports.getTicket = async (req, res) => {
  try {
    let ticket;
    if (req.user.role === 'admin') {
      ticket = await Ticket.findById(req.params.id)
        .populate('user', 'username email')
        .populate('assignedTo', 'username')
        .populate('messages.user', 'username');
    } else {
      ticket = await Ticket.findOne({
        _id: req.params.id,
        user: req.user.id
      })
        .populate('user', 'username email')
        .populate('assignedTo', 'username')
        .populate('messages.user', 'username');
    }

    if (!ticket) {
      return res.status(404).json({
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching ticket',
      error: error.message
    });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;

    const ticket = await Ticket.create({
      user: req.user.id,
      title,
      description,
      category,
      priority
    });

    await ticket.populate('user', 'username email');

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      ticket
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error creating ticket',
      error: error.message
    });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const { status, priority, assignedTo } = req.body;
    
    let ticket;
    if (req.user.role === 'admin') {
      ticket = await Ticket.findById(req.params.id);
    } else {
      ticket = await Ticket.findOne({
        _id: req.params.id,
        user: req.user.id
      });
    }

    if (!ticket) {
      return res.status(404).json({
        message: 'Ticket not found'
      });
    }

    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (assignedTo && req.user.role === 'admin') ticket.assignedTo = assignedTo;

    await ticket.save();
    await ticket.populate('user', 'username email');
    await ticket.populate('assignedTo', 'username');

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      ticket
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating ticket',
      error: error.message
    });
  }
};

exports.addMessage = async (req, res) => {
  try {
    const { message } = req.body;
    
    let ticket;
    if (req.user.role === 'admin') {
      ticket = await Ticket.findById(req.params.id);
    } else {
      ticket = await Ticket.findOne({
        _id: req.params.id,
        user: req.user.id
      });
    }

    if (!ticket) {
      return res.status(404).json({
        message: 'Ticket not found'
      });
    }

    ticket.messages.push({
      user: req.user.id,
      message,
      isAdmin: req.user.role === 'admin'
    });

    await ticket.save();
    await ticket.populate('user', 'username email');
    await ticket.populate('assignedTo', 'username');
    await ticket.populate('messages.user', 'username');

    res.json({
      success: true,
      message: 'Message added successfully',
      ticket
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error adding message',
      error: error.message
    });
  }
};