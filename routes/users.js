const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateCardStatus,
  changePassword,
  getUserProfile,
  updateUserProfile,
  connectWallet,
  applyForCard
} = require('../controllers/userController');
const auth = require('../middleware/auth'); // Corrected from protect
const admin = require('../middleware/admin'); // Corrected from protect

const router = express.Router();

router.get('/', [auth, admin], getUsers);
router.route('/profile').get(auth, getUserProfile).put(auth, updateUserProfile);
router.put('/change-password', auth, changePassword);
router.put('/connect-wallet', auth, connectWallet);
router.post('/apply-card', auth, applyForCard);

router.get('/:id', auth, getUser);
router.put('/:id', auth, updateUser);
router.delete('/:id', [auth, admin], deleteUser); // This was correct
router.patch('/:id/card-status', auth, updateCardStatus);

module.exports = router;
