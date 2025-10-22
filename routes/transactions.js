const express = require('express');
const { 
  deposit, 
  withdraw, 
  sendMoney, 
  requestMoney, 
  getTransactions,
  getTransaction
} = require('../controllers/transactionController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, getTransactions);
router.get('/:id', auth, getTransaction);
router.post('/deposit', auth, deposit);
router.post('/withdraw', auth, withdraw);
router.post('/send', auth, sendMoney);
router.post('/request', auth, requestMoney);

module.exports = router;