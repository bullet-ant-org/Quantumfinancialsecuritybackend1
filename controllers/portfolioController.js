const User = require('../models/User');
const cryptoService = require('../config/cryptoService');

// Mapping from our symbols to CoinGecko API IDs
const coinGeckoIds = {
  XLM: 'stellar',
  XRP: 'ripple',
};

// @desc    Get user's portfolio (Stellar and Ripple balances)
// @route   GET /api/portfolio
// @access  Private
exports.getPortfolio = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { stellarAddress, rippleAddress } = user;
    if (!stellarAddress && !rippleAddress) {
      return res.status(404).json({ message: 'No wallet addresses found for this user.' });
    }

    const assets = [];
    let totalValue = 0;

    // 1. Fetch live prices from CoinGecko
    let prices = {};
    const coinIds = Object.values(coinGeckoIds).join(',');
    if (coinIds) {
      try {
        const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`);
        if (priceRes.ok) {
          prices = await priceRes.json();
        }
      } catch (priceError) {
        console.warn(`Could not fetch live asset prices from CoinGecko: ${priceError.message}`);
      }
    }

    // --- Create a list of promises to fetch all balances in parallel ---
    const balancePromises = [];

    // 2. Fetch Stellar XLM balance
    if (stellarAddress) {
      balancePromises.push(cryptoService.getStellarBalance(stellarAddress));
    }

    // 3. Fetch Ripple XRP balance
    if (rippleAddress) {
      balancePromises.push(cryptoService.getRippleBalance(rippleAddress));
    }

    // --- Resolve balance promises ---
    const settledResults = await Promise.allSettled(balancePromises);
    for (const result of settledResults) {
      if (result.status === 'fulfilled' && result.value && result.value.quantity > 0) {
        assets.push(result.value);
      } else if (result.status === 'rejected') {
        console.error(`A balance promise failed: ${result.reason}`);
      }
    }

    // --- Calculate total value ---
    for (const asset of assets) {
      const price = prices[coinGeckoIds[asset.symbol]]?.usd || 0;
      asset.value = asset.quantity * price;
      totalValue += asset.value;
    }

    res.json({
      assets: assets.sort((a, b) => b.value - a.value), // Sort by value descending
      totalValue,
    });

  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ message: 'Server error while fetching portfolio.' });
  }
};
