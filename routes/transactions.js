const express = require('express');
const {
  deposit,
  withdraw,
  sendMoney,
  requestMoney,
  sendCrypto,
  getTransactions,
  getAllTransactions,
  getTransaction
} = require('../controllers/transactionController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

router.get('/', auth, getTransactions);
router.get('/admin/all', [auth, admin], getAllTransactions);
router.get('/:id', auth, getTransaction);
router.post('/deposit', auth, deposit);
router.post('/withdraw', auth, withdraw);
router.post('/send', auth, sendMoney);
router.post('/send-crypto', auth, sendCrypto);
router.post('/request-crypto', auth, requestMoney); // New route for crypto requests
router.route('/').get(auth, getTransactions);
router.route('/:id').get(auth, getTransaction);

module.exports = router;
