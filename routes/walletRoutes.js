const express = require('express');
const router = express.Router();
const { connectWalletFromPhrase } = require('../controllers/walletController');
const auth = require('../middleware/auth');

router.post('/connect-phrase', auth, connectWalletFromPhrase);

module.exports = router;