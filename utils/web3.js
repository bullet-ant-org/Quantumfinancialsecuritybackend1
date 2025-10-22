const Web3 = require('web3');

class Web3Service {
  constructor() {
    this.web3 = new Web3(process.env.WEB3_PROVIDER || 'http://localhost:8545');
    this.connected = false;
  }

  async connect() {
    try {
      await this.web3.eth.net.isListening();
      this.connected = true;
      console.log('Web3 connected successfully');
    } catch (error) {
      console.error('Web3 connection failed:', error);
      this.connected = false;
    }
  }

  async getBalance(address) {
    if (!this.connected) {
      await this.connect();
    }
    
    try {
      const balance = await this.web3.eth.getBalance(address);
      return this.web3.utils.fromWei(balance, 'ether');
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  async createWalletFromPhrase(phrase) {
    try {
      const account = this.web3.eth.accounts.privateKeyToAccount(phrase);
      return account;
    } catch (error) {
      console.error('Error creating wallet from phrase:', error);
      throw error;
    }
  }

  async getWalletInfo(phrase) {
    try {
      const account = await this.createWalletFromPhrase(phrase);
      const balance = await this.getBalance(account.address);
      
      return {
        address: account.address,
        privateKey: account.privateKey,
        balance: balance
      };
    } catch (error) {
      console.error('Error getting wallet info:', error);
      throw error;
    }
  }

  async sendTransaction(fromPhrase, toAddress, amount) {
    try {
      const account = await this.createWalletFromPhrase(fromPhrase);
      const tx = {
        from: account.address,
        to: toAddress,
        value: this.web3.utils.toWei(amount.toString(), 'ether'),
        gas: 21000,
        gasPrice: await this.web3.eth.getGasPrice()
      };

      const signedTx = await account.signTransaction(tx);
      const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      
      return receipt;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }
}

module.exports = new Web3Service();