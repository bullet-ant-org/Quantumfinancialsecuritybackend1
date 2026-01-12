const express = require('express');
const {
  deposit,
  withdraw,
  sendMoney,
  requestMoney,
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
router.post('/request', auth, requestMoney);
router.route('/').get(auth, getTransactions);
router.route('/:id').get(auth, getTransaction);

module.exports = router;
