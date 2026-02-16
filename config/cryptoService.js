/**
 * Fetches the XLM balance for a given Stellar address.
 * @param {string} address The Stellar wallet address.
 * @returns {Promise<object|null>} An object containing the asset details or null on error.
 */
const getStellarBalance = async (address) => {
  try {
    const response = await fetch(`https://horizon.stellar.org/accounts/${address}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const nativeBalance = data.balances.find(balance => balance.asset_type === 'native');
    if (nativeBalance) {
      const quantity = parseFloat(nativeBalance.balance);
      return { name: 'Stellar', symbol: 'XLM', quantity, value: 0 };
    }
    return { name: 'Stellar', symbol: 'XLM', quantity: 0, value: 0 };
  } catch (error) {
    console.error(`Error fetching XLM balance for ${address}:`, error.message);
    return null;
  }
};

/**
 * Fetches the XRP balance for a given Ripple address.
 * @param {string} address The Ripple wallet address.
 * @returns {Promise<object|null>} An object containing the asset details or null on error.
 */
const getRippleBalance = async (address) => {
  try {
    const response = await fetch('https://s1.ripple.com:51234/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'account_info',
        params: [{ account: address }]
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.result && data.result.account_data) {
      const balanceDrops = parseFloat(data.result.account_data.Balance);
      const quantity = balanceDrops / 1000000; // XRP has 6 decimal places
      return { name: 'Ripple', symbol: 'XRP', quantity, value: 0 };
    }
    return { name: 'Ripple', symbol: 'XRP', quantity: 0, value: 0 };
  } catch (error) {
    console.error(`Error fetching XRP balance for ${address}:`, error.message);
    return null;
  }
};

/**
 * Sends XLM from a Stellar account using mnemonic phrase.
 * @param {string} phrase - The mnemonic phrase.
 * @param {string} destination - The destination address.
 * @param {number} amount - The amount to send.
 * @returns {Promise<object>} Transaction result.
 */
const sendStellar = async (phrase, destination, amount) => {
  const StellarSdk = require('stellar-sdk');
  const bip39 = require('bip39');

  try {
    // Derive keypair from phrase
    const seed = bip39.mnemonicToSeedSync(phrase);
    const keypair = StellarSdk.Keypair.fromRawEd25519Seed(seed.slice(0, 32));

    // Load account
    const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
    const account = await server.loadAccount(keypair.publicKey());

    // Build transaction
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.PUBLIC,
    })
      .addOperation(StellarSdk.Operation.payment({
        destination: destination,
        asset: StellarSdk.Asset.native(),
        amount: amount.toString(),
      }))
      .setTimeout(180)
      .build();

    // Sign and submit
    transaction.sign(keypair);
    const result = await server.submitTransaction(transaction);

    return { success: true, transactionHash: result.hash };
  } catch (error) {
    console.error('Error sending Stellar transaction:', error);
    throw new Error(`Failed to send XLM: ${error.message}`);
  }
};

/**
 * Sends XRP from a Ripple account using mnemonic phrase.
 * @param {string} phrase - The mnemonic phrase.
 * @param {string} destination - The destination address.
 * @param {number} amount - The amount to send.
 * @returns {Promise<object>} Transaction result.
 */
const sendRipple = async (phrase, destination, amount) => {
  const RippleAPI = require('ripple-lib').RippleAPI;
  const keypairs = require('ripple-keypairs');
  const bip39 = require('bip39');

  try {
    // Derive keypair from phrase
    const entropyHex = bip39.mnemonicToEntropy(phrase);
    const entropyBuffer = Buffer.from(entropyHex, 'hex');
    const seed = keypairs.generateSeed({ entropy: entropyBuffer });
    const keypair = keypairs.deriveKeypair(seed);
    const address = keypairs.deriveAddress(keypair.publicKey);

    // Connect to Ripple
    const api = new RippleAPI({ server: 'wss://s1.ripple.com' });
    await api.connect();

    // Prepare transaction
    const preparedTx = await api.preparePayment(address, {
      source: {
        address: address,
        maxAmount: {
          value: amount.toString(),
          currency: 'XRP'
        }
      },
      destination: {
        address: destination,
        amount: {
          value: amount.toString(),
          currency: 'XRP'
        }
      }
    }, {
      maxLedgerVersionOffset: 5
    });

    // Sign
    const signedTx = api.sign(preparedTx.txJSON, keypair.privateKey);

    // Submit
    const result = await api.submit(signedTx.signedTransaction);

    await api.disconnect();

    if (result.resultCode === 'tesSUCCESS') {
      return { success: true, transactionHash: signedTx.id };
    } else {
      throw new Error(`Transaction failed: ${result.resultCode}`);
    }
  } catch (error) {
    console.error('Error sending Ripple transaction:', error);
    throw new Error(`Failed to send XRP: ${error.message}`);
  }
};

module.exports = {
  getStellarBalance,
  getRippleBalance,
  sendStellar,
  sendRipple,
};
