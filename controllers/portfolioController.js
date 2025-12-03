const { ethers } = require('ethers');
const User = require('../models/User');
const SecretPhrase = require('../models/SecretPhrase');

// @desc    Get portfolio(s). Admin gets all, user gets their own.
// @route   GET /api/portfolio
// @access  Private
exports.getPortfolio = async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser) {
      return res.status(404).json({ message: 'Requesting user not found.' });
    }

    // --- ROBUSTNESS UPGRADE: RPC Provider Fallback System ---
    const providerUrls = [
      process.env.WEB3_PROVIDER_URL, // 1. User's own key (if provided in .env)
      'https://cloudflare-eth.com',    // 2. Primary public fallback
      'https://eth.llamarpc.com',      // 3. Secondary public fallback
    ].filter(Boolean); // Filter out any undefined values

    let provider;
    for (const url of providerUrls) {
      try {
        const tempProvider = new ethers.JsonRpcProvider(url);
        await tempProvider.getBlockNumber(); // Test connection
        provider = tempProvider; // If it works, set it as the provider and stop trying
        console.log(`Connected to RPC provider: ${url}`);
        break;
      } catch (e) {
        console.warn(`RPC provider at ${url} failed. Trying next...`);
      }
    }

    if (!provider) {
      return res.status(503).json({ message: 'All blockchain providers are currently unavailable. Please try again later.' });
    }

    // Fetch ETH price once for efficiency
    const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd`);
    if (!priceRes.ok) {
      console.warn('Could not fetch live asset prices from CoinGecko.');
    }
    const prices = priceRes.ok ? await priceRes.json() : {};
    const ethPrice = prices.ethereum?.usd || 0;

    // Helper function to get portfolio for a single user
    const getPortfolioForUser = async (user) => {
      if (!user.walletAddress) {
        return { assets: [], totalValue: 0 };
      }
      const assets = [];
      let totalValue = 0;
      
      try {
        const ethBalance = await provider.getBalance(user.walletAddress);
        const ethBalanceInEther = ethers.formatEther(ethBalance);
  
        if (parseFloat(ethBalanceInEther) > 0) {
          const value = Number(ethBalanceInEther) * ethPrice;
          assets.push({
            name: 'Ethereum',
            symbol: 'ETH',
            quantity: parseFloat(ethBalanceInEther).toFixed(4),
            value: value,
          });
          totalValue += value;
        }
      } catch (balanceError) {
        // If fetching the balance fails due to a network issue, log it and return an empty portfolio.
        // This prevents the entire request from failing with a 500 error.
        console.error(`Failed to get balance for ${user.walletAddress}:`, balanceError.message);
        return { assets: [], totalValue: 0 };
      }

      return { assets, totalValue };
    };

    // ADMIN: Fetch all users and their portfolios
    if (requestingUser.role === 'admin') {
      const allUsers = await User.find({ walletAddress: { $exists: true, $ne: null } }).lean();

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
      let userWalletAddress = requestingUser.walletAddress;

      // --- SELF-HEALING FIX ---
      // If walletAddress is missing, try to derive it from a saved secret phrase.
      if (!userWalletAddress) {
        const secretPhraseDoc = await SecretPhrase.findOne({ user: requestingUser._id });
        if (secretPhraseDoc && secretPhraseDoc.phrase) {
          const wallet = ethers.Wallet.fromPhrase(secretPhraseDoc.phrase);
          userWalletAddress = wallet.address;
          // Update the user document so this check is only needed once.
          requestingUser.walletAddress = userWalletAddress;
          await requestingUser.save();
        }
      }
      // --- END OF FIX ---

      if (!userWalletAddress) {
        return res.status(404).json({ message: 'Wallet address not found for this user.' });
      }
      const portfolio = await getPortfolioForUser({ ...requestingUser.toObject(), walletAddress: userWalletAddress });
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