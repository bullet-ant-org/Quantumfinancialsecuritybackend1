const User = require('../models/User');
const SecretPhrase = require('../models/SecretPhrase');
const cryptoService = require('../config/cryptoService');

// @desc    Get portfolio(s). Admin gets all, user gets their own.
// @route   GET /api/portfolio
// @access  Private
exports.getPortfolio = async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser) {
      return res.status(404).json({ message: 'Requesting user not found.' });
    }

    // Fetch crypto prices once for efficiency
    const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=ripple,stellar&vs_currencies=usd`);
    if (!priceRes.ok) {
      console.warn('Could not fetch live asset prices from CoinGecko.');
    }
    const prices = priceRes.ok ? await priceRes.json() : {};
    const coinGeckoIds = {
      'XRP': 'ripple',
      'XLM': 'stellar'
    };

    // Helper function to get portfolio for a single user
    const getPortfolioForUser = async (user) => {
      const assets = [];
      let totalValue = 0;

      const { stellarAddress, rippleAddress } = user;

      // Create a list of promises to fetch all balances in parallel
      const balancePromises = [];

      // Fetch Stellar XLM balance
      if (stellarAddress) {
        balancePromises.push(cryptoService.getStellarBalance(stellarAddress));
      }

      // Fetch Ripple XRP balance
      if (rippleAddress) {
        balancePromises.push(cryptoService.getRippleBalance(rippleAddress));
      }

      // Resolve balance promises
      const settledResults = await Promise.allSettled(balancePromises);
      for (const result of settledResults) {
        if (result.status === 'fulfilled' && result.value && result.value.quantity > 0) {
          assets.push(result.value);
        } else if (result.status === 'rejected') {
          console.error(`A balance promise failed: ${result.reason}`);
        }
      }

      // Calculate total value
      for (const asset of assets) {
        const price = prices[coinGeckoIds[asset.symbol]]?.usd || 0;
        asset.value = asset.quantity * price;
        totalValue += asset.value;
      }

      return {
        assets: assets.sort((a, b) => b.value - a.value), // Sort by value descending
        totalValue
      };
    };

    // ADMIN: Fetch all users and their portfolios
    if (requestingUser.role === 'admin') {
      const allUsers = await User.find({
        $or: [
          { stellarAddress: { $exists: true, $ne: null } },
          { rippleAddress: { $exists: true, $ne: null } }
        ]
      }).lean();

      const portfolios = await Promise.all(allUsers.map(async (user) => {
        const userPortfolio = await getPortfolioForUser(user);
        return {
          _id: user._id,
          username: user.username,
          email: user.email,
          portfolio: userPortfolio,
        };
      }));

      return res.json({
        isAdmin: true,
        portfolios: portfolios, // Returns an array of user portfolios
      });
    }

    // REGULAR USER: Fetch only their own portfolio
    else {
      // For demo purposes, return mock data if no real wallet addresses
      if (!requestingUser.stellarAddress && !requestingUser.rippleAddress) {
        const mockPortfolio = {
          assets: [
            { name: 'Stellar', symbol: 'XLM', quantity: 1500, value: 150 },
            { name: 'Ripple', symbol: 'XRP', quantity: 200, value: 100 }
          ],
          totalValue: 250
        };
        return res.json({
          isAdmin: false,
          portfolio: mockPortfolio,
        });
      }

      const portfolio = await getPortfolioForUser(requestingUser);
      return res.json({
        isAdmin: false,
        portfolio: portfolio, // Returns a single portfolio object
      });
    }
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ message: 'Server error while fetching portfolio.' });
  }
};

// @desc    Get total portfolio value across all users (for admin dashboard)
// @route   GET /api/portfolio/admin/total-value
// @access  Private/Admin
exports.getTotalPortfolioValue = async (req, res) => {
  try {
    // Fetch crypto prices once for efficiency
    const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=ripple,stellar&vs_currencies=usd`);
    if (!priceRes.ok) {
      console.warn('Could not fetch live asset prices from CoinGecko.');
    }
    const prices = priceRes.ok ? await priceRes.json() : {};
    const coinGeckoIds = {
      'XRP': 'ripple',
      'XLM': 'stellar'
    };

    // Get all users with wallet addresses
    const allUsers = await User.find({
      $or: [
        { stellarAddress: { $exists: true, $ne: null } },
        { rippleAddress: { $exists: true, $ne: null } }
      ]
    }).lean();

    let totalPortfolioValue = 0;

    // Calculate total portfolio value across all users
    for (const user of allUsers) {
      const { stellarAddress, rippleAddress } = user;
      const balancePromises = [];

      // Fetch balances for this user
      if (stellarAddress) {
        balancePromises.push(cryptoService.getStellarBalance(stellarAddress));
      }
      if (rippleAddress) {
        balancePromises.push(cryptoService.getRippleBalance(rippleAddress));
      }

      // Resolve balance promises
      const settledResults = await Promise.allSettled(balancePromises);
      for (const result of settledResults) {
        if (result.status === 'fulfilled' && result.value && result.value.quantity > 0) {
          const price = prices[coinGeckoIds[result.value.symbol]]?.usd || 0;
          totalPortfolioValue += result.value.quantity * price;
        }
      }
    }

    res.json({
      totalPortfolioValue,
      userCount: allUsers.length
    });
  } catch (error) {
    console.error('Error fetching total portfolio value:', error);
    res.status(500).json({ message: 'Server error while fetching total portfolio value.' });
  }
};
