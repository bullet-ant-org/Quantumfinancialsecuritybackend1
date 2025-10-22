const express = require('express');
const { 
  createTicket, 
  getTickets, 
  getTicket, 
  updateTicket,
  addMessage,
  getAdminTickets 
} = require('../controllers/ticketController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

router.get('/', auth, getTickets);
router.get('/admin/all', [auth, admin], getAdminTickets);
router.get('/:id', auth, getTicket);
router.post('/', auth, createTicket);
router.put('/:id', auth, updateTicket);
router.post('/:id/messages', auth, addMessage);

module.exports = router;