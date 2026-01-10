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

module.exports = {
  getStellarBalance,
  getRippleBalance,
};
