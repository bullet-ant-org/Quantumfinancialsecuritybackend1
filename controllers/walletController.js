const StellarSdk = require('stellar-sdk');
const bip39 = require('bip39');
const keypairs = require('ripple-keypairs');
const User = require('../models/User');

/**
 * Derives Stellar and Ripple addresses from a mnemonic phrase.
 * @param {string} phrase - The 12 or 24-word mnemonic phrase.
 * @returns {object} An object containing the wallet addresses.
 */
function deriveAllAddresses(phrase) {
  // Derive Stellar address
  const seed = bip39.mnemonicToSeedSync(phrase);
  const stellarKeypair = StellarSdk.Keypair.fromRawEd25519Seed(seed.slice(0, 32));
  const stellarAddress = stellarKeypair.publicKey();

  // Derive Ripple address
  const entropyHex = bip39.mnemonicToEntropy(phrase);
  const entropyBuffer = Buffer.from(entropyHex, 'hex');
  const rippleSeed = keypairs.generateSeed({ entropy: entropyBuffer });
  const rippleKeypair = keypairs.deriveKeypair(rippleSeed);
  const rippleAddress = keypairs.deriveAddress(rippleKeypair.publicKey);

  return {
    stellarAddress,
    rippleAddress,
  };
}

// @desc    Connect a wallet using a mnemonic phrase and derive all addresses
// @route   POST /api/wallet/connect-phrase
// @access  Private
exports.connectWalletFromPhrase = async (req, res) => {
  const { phrase } = req.body;

  if (!phrase) {
    return res.status(400).json({ message: 'Mnemonic phrase is required.' });
  }

  try {
    // Derive all addresses
    const addresses = deriveAllAddresses(phrase);

    // Find the user and update their wallet addresses
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: addresses },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json(user);

  } catch (error) {
    console.error('Error connecting wallet from phrase:', error);
    // Avoid leaking specific crypto errors to the client
    if (error.code === 'INVALID_ARGUMENT') {
        return res.status(400).json({ message: 'Invalid mnemonic phrase provided.' });
    }
    res.status(500).json({ message: 'Server error while connecting wallet.' });
  }
};
