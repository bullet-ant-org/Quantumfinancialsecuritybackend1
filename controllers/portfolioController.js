const { ethers } = require('ethers');
const User = require('../models/User');

// A minimal ERC20 ABI to get the balance, name, symbol, and decimals
const erc20Abi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
];

// A list of common ERC20 token addresses on the Ethereum mainnet
const tokenAddresses = {
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  SHIB: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
  LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
};

// Mapping from our symbols to CoinGecko API IDs
const coinGeckoIds = {
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  DAI: 'dai',
  SHIB: 'shiba-inu',
  LINK: 'chainlink',
  WBTC: 'wrapped-bitcoin',
};

// @desc    Get user's portfolio (ETH and token balances)
// @route   GET /api/portfolio
// @access  Private
exports.getPortfolio = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.walletAddress) {
      return res.status(404).json({ message: 'Wallet address not found for this user.' });
    }

    // Use a public provider. Replace with your own if you have one (e.g., from Infura or Alchemy)
    const provider = new ethers.JsonRpcProvider(process.env.WEB3_PROVIDER_URL || 'https://rpc.ankr.com/eth');

    const { walletAddress } = user;
    const assets = [];
    let totalValue = 0;

    // 1. Fetch live prices from CoinGecko
    const coinIds = Object.values(coinGeckoIds).join(',');
    const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`);
    if (!priceRes.ok) {
      // If price feed fails, we can either throw or proceed without prices.
      // For a better UX, we'll proceed but log a warning.
      console.warn('Could not fetch live asset prices from CoinGecko.');
    }
    const prices = priceRes.ok ? await priceRes.json() : {};

    // 2. Get ETH balance
    const ethBalance = await provider.getBalance(walletAddress);
    const ethBalanceInEther = ethers.formatEther(ethBalance);
    if (parseFloat(ethBalanceInEther) > 0) {
      const price = prices.ethereum?.usd || 0;
      const value = Number(ethBalanceInEther) * price;
      assets.push({
        name: 'Ethereum',
        symbol: 'ETH',
        quantity: parseFloat(ethBalanceInEther).toFixed(4),
        value: value,
      });
      totalValue += value;
    }

    // 3. Get ERC20 token balances
    for (const symbol in tokenAddresses) {
      const tokenAddress = tokenAddresses[symbol];
      const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);

      try {
        const [balance, decimals] = await Promise.all([
          contract.balanceOf(walletAddress),
          contract.decimals(),
        ]);

        if (balance > 0) {
          const formattedBalance = ethers.formatUnits(balance, decimals);
          const price = prices[coinGeckoIds[symbol]]?.usd || 1; // Default to 1 for stablecoins if price is missing
          const value = Number(formattedBalance) * price;
          assets.push({
            name: await contract.name(),
            symbol: symbol,
            quantity: Number(formattedBalance).toFixed(4),
            value: value,
          });
          totalValue += value;
        }
      } catch (tokenError) {
        // Ignore errors for tokens the user might not have, or contract issues
        console.warn(`Could not fetch balance for ${symbol}: ${tokenError.message}`);
      }
    }

    res.json({
      assets,
      totalValue,
    });

  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ message: 'Server error while fetching portfolio.' });
  }
};