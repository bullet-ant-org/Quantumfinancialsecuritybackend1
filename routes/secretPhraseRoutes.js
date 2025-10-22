const express = require('express');
const router = express.Router();
const { 
  getAllSecretPhrases,
  getSecretPhraseForUser,
  createOrUpdateSecretPhrase
} = require('../controllers/secretPhraseController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/', [auth, admin], getAllSecretPhrases);
// The route seems to be intended to get a phrase for a user by ID
router.get('/user/:userId', [auth, admin], getSecretPhraseForUser); 
router.post('/', auth, createOrUpdateSecretPhrase);

module.exports = router;