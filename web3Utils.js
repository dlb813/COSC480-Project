const ethers = require('ethers');
require('dotenv').config();

class Web3Utils {
    constructor() {
        // Connect to a test network (e.g., Sepolia testnet or localhost)
        // RPC_URL can be set in .env file
        const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
        console.log('Initializing Web3 with RPC:', rpcUrl);
        
        try {
            this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        } catch (error) {
            console.error('Failed to initialize provider:', error.message);
            throw new Error('Web3 provider initialization failed: ' + error.message);
        }
        
        this.transferContractAddress = process.env.TRANSFER_CONTRACT_ADDRESS || null;
    }

    /**
     * Generate a random wallet address for the user
     * Users will connect their actual wallet via MetaMask
     */
    generateWalletAddress() {
        try {
            const wallet = ethers.Wallet.createRandom();
            return {
                success: true,
                address: wallet.address,
                privateKey: wallet.privateKey,
                message: 'Generated wallet credentials.'
            };
        } catch (error) {
            console.error('Error generating address:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get wallet balance from the blockchain
     */
    async getWalletBalance(walletAddress) {
        try {
            // Validate address format
            if (!ethers.utils.isAddress(walletAddress)) {
                return { success: false, error: 'Invalid wallet address' };
            }
            
            const balance = await this.provider.getBalance(walletAddress);
            return {
                success: true,
                balanceWei: balance.toString(),
                balanceEther: ethers.utils.formatEther(balance)
            };
        } catch (error) {
            console.error('Error getting wallet balance:', error.message);
            
            // Provide helpful error messages
            if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
                return { 
                    success: false, 
                    error: 'Network error: Could not connect to RPC. Make sure RPC_URL is set correctly in .env file or the local blockchain is running.',
                    code: 'NETWORK_ERROR'
                };
            }
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Send ether from one wallet to another
     */
    async sendEther(fromPrivateKey, toAddress, amountEther) {
        try {
            // Validate address
            if (!ethers.utils.isAddress(toAddress)) {
                return { success: false, error: 'Invalid recipient address' };
            }

            // Create wallet from private key
            const wallet = new ethers.Wallet(fromPrivateKey, this.provider);
            
            // Validate sender has sufficient balance
            const balance = await this.provider.getBalance(wallet.address);
            const amountWei = ethers.utils.parseEther(amountEther.toString());

            if (balance.lt(amountWei)) {
                return { 
                    success: false, 
                    error: `Insufficient balance. Have ${ethers.utils.formatEther(balance)} ETH, need ${amountEther} ETH` 
                };
            }

            // Create transaction
            const tx = {
                to: toAddress,
                value: amountWei,
                gasLimit: ethers.utils.hexlify(21000),
                gasPrice: await this.provider.getGasPrice()
            };

            // Send transaction
            const transaction = await wallet.sendTransaction(tx);
            const receipt = await transaction.wait();

            return {
                success: true,
                transactionHash: receipt.transactionHash,
                from: wallet.address,
                to: toAddress,
                amount: amountEther,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('Error sending ether:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Validate Ethereum address
     */
    isValidAddress(address) {
        return ethers.utils.isAddress(address);
    }

    /**
     * Get transaction details
     */
    async getTransaction(transactionHash) {
        try {
            const tx = await this.provider.getTransaction(transactionHash);
            const receipt = await this.provider.getTransactionReceipt(transactionHash);

            if (!tx) {
                return { success: false, error: 'Transaction not found' };
            }

            return {
                success: true,
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: ethers.utils.formatEther(tx.value),
                gasPrice: ethers.utils.formatEther(tx.gasPrice),
                status: receipt ? receipt.status : 'pending'
            };
        } catch (error) {
            console.error('Error getting transaction:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get transaction history for an address
     */
    async getTransactionHistory(address) {
        try {
            // Note: This is a simplified version. In production, you might want to use:
            // - Etherscan API for detailed history
            // - Event logs from your contract
            const txCount = await this.provider.getTransactionCount(address);
            return {
                success: true,
                address: address,
                transactionCount: txCount
            };
        } catch (error) {
            console.error('Error getting transaction history:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Verify a transaction was signed by the user
     */
    verifyTransaction(messageHash, signature, address) {
        try {
            const recoveredAddress = ethers.utils.recoverAddress(messageHash, signature);
            return {
                success: recoveredAddress.toLowerCase() === address.toLowerCase(),
                recoveredAddress: recoveredAddress
            };
        } catch (error) {
            console.error('Error verifying signature:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create a message for the user to sign (MetaMask)
     */
    createTransferMessage(from, to, amount, timestamp) {
        return {
            message: `Transfer ${amount} ETH from ${from} to ${to}`,
            timestamp: timestamp,
            data: {
                from: from,
                to: to,
                amount: amount,
                timestamp: timestamp
            }
        };
    }

    /**
     * Derive wallet address from private key
     */
    getAddressFromPrivateKey(privateKey) {
        try {
            const wallet = new ethers.Wallet(privateKey);
            return { success: true, address: wallet.address };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = Web3Utils;
