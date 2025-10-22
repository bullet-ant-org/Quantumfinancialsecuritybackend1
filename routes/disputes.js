const express = require('express');
const { 
  createDispute, 
  getDisputes, 
  getDispute, 
  updateDispute,
  resolveDispute 
} = require('../controllers/disputeController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

router.get('/', auth, getDisputes);
router.get('/:id', auth, getDispute);
router.post('/', auth, createDispute);
router.put('/:id', auth, updateDispute);
router.patch('/:id/resolve', [auth, admin], resolveDispute);

module.exports = router;