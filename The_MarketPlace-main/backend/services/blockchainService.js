// Blockchain Service - Bridge between marketplace and blockchain backend
const axios = require('axios');

const BLOCKCHAIN_API_URL = process.env.BLOCKCHAIN_API_URL || 'http://localhost:4000';
const BLOCKCHAIN_RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:26657';
const BLOCKCHAIN_REST_URL = process.env.BLOCKCHAIN_REST_URL || 'http://localhost:1317';
const ENABLE_BLOCKCHAIN_SYNC = process.env.ENABLE_BLOCKCHAIN_SYNC === 'true';

class BlockchainService {
    constructor() {
        this.apiClient = axios.create({
            baseURL: BLOCKCHAIN_API_URL,
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });

        this.rpcClient = axios.create({
            baseURL: BLOCKCHAIN_RPC_URL,
            timeout: 5000
        });

        this.restClient = axios.create({
            baseURL: BLOCKCHAIN_REST_URL,
            timeout: 5000
        });

        this.isAvailable = false;
        this.lastHealthCheck = null;
    }

    /**
     * Check if blockchain services are available
     */
    async healthCheck() {
        if (!ENABLE_BLOCKCHAIN_SYNC) {
            this.isAvailable = false;
            return { available: false, reason: 'Blockchain sync disabled' };
        }

        try {
            const [apiHealth, rpcStatus] = await Promise.all([
                this.apiClient.get('/api/health').catch(() => null),
                this.rpcClient.get('/status').catch(() => null)
            ]);

            this.isAvailable = !!(apiHealth && rpcStatus);
            this.lastHealthCheck = new Date();

            return {
                available: this.isAvailable,
                api: !!apiHealth,
                rpc: !!rpcStatus,
                timestamp: this.lastHealthCheck
            };
        } catch (error) {
            this.isAvailable = false;
            return { available: false, error: error.message };
        }
    }

    /**
     * Create a blockchain vault for a user
     * @param {string} userId - Marketplace user ID
     * @param {object} data - Vault initialization data
     * @param {string} token - JWT token for authentication
     */
    async createVault(userId, data = {}, token) {
        if (!this.isAvailable && !(await this.healthCheck()).available) {
            throw new Error('Blockchain service unavailable');
        }

        try {
            const response = await this.apiClient.post('/api/vault', {
                authority: userId,
                status: 'active',
                data: {
                    userId,
                    createdAt: new Date().toISOString(),
                    ...data
                }
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            return response.data;
        } catch (error) {
            console.error('[BlockchainService] createVault error:', error.message);
            throw new Error(`Failed to create vault: ${error.message}`);
        }
    }

    /**
     * Get vault details by ID
     * @param {string} vaultId - Vault ID
     * @param {string} token - JWT token
     */
    async getVault(vaultId, token) {
        if (!this.isAvailable && !(await this.healthCheck()).available) {
            throw new Error('Blockchain service unavailable');
        }

        try {
            const response = await this.apiClient.get(`/api/vault/${vaultId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            return response.data;
        } catch (error) {
            console.error('[BlockchainService] getVault error:', error.message);
            throw new Error(`Failed to get vault: ${error.message}`);
        }
    }

    /**
     * Sign a transaction using blockchain vault
     * @param {string} vaultId - Vault ID
     * @param {object} txData - Transaction data to sign
     * @param {string} token - JWT token
     */
    async signTransaction(vaultId, txData, token) {
        if (!this.isAvailable && !(await this.healthCheck()).available) {
            throw new Error('Blockchain service unavailable');
        }

        try {
            const response = await this.apiClient.post('/api/tx/sign', {
                vaultId,
                data: txData
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            return response.data;
        } catch (error) {
            console.error('[BlockchainService] signTransaction error:', error.message);
            throw new Error(`Failed to sign transaction: ${error.message}`);
        }
    }

    /**
     * Get blockchain node status
     */
    async getNodeStatus() {
        try {
            const response = await this.rpcClient.get('/status');
            return response.data;
        } catch (error) {
            console.error('[BlockchainService] getNodeStatus error:', error.message);
            return null;
        }
    }

    /**
     * Get blockchain info (latest block, chain ID, etc.)
     */
    async getBlockchainInfo() {
        try {
            const response = await this.restClient.get('/cosmos/base/tendermint/v1beta1/node_info');
            return response.data;
        } catch (error) {
            console.error('[BlockchainService] getBlockchainInfo error:', error.message);
            return null;
        }
    }

    /**
     * Synchronize marketplace wallet with blockchain vault
     * @param {string} userId - User ID
     * @param {object} walletData - Marketplace wallet data
     * @param {string} token - JWT token
     */
    async syncWallet(userId, walletData, token) {
        if (!ENABLE_BLOCKCHAIN_SYNC || !this.isAvailable) {
            return { synced: false, reason: 'Blockchain sync disabled or unavailable' };
        }

        try {
            // Check if user has a vault
            const vaults = await this.apiClient.get(`/api/vault?authority=${userId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            }).catch(() => ({ data: [] }));

            let vault;
            if (!vaults.data || vaults.data.length === 0) {
                // Create vault if doesn't exist
                vault = await this.createVault(userId, {
                    balance: walletData.balance || 0,
                    currency: walletData.currency || 'KES'
                }, token);
            } else {
                vault = vaults.data[0];
            }

            return {
                synced: true,
                vaultId: vault._id || vault.id,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('[BlockchainService] syncWallet error:', error.message);
            return { synced: false, error: error.message };
        }
    }

    /**
     * Record transaction on blockchain
     * @param {object} txData - Transaction data
     * @param {string} token - JWT token
     */
    async recordTransaction(txData, token) {
        if (!ENABLE_BLOCKCHAIN_SYNC || !this.isAvailable) {
            return { recorded: false, reason: 'Blockchain sync disabled or unavailable' };
        }

        try {
            const response = await this.apiClient.post('/api/tx', {
                type: txData.type || 'transfer',
                amount: txData.amount,
                from: txData.from,
                to: txData.to,
                metadata: {
                    marketplaceTxId: txData.id,
                    timestamp: txData.createdAt || new Date().toISOString(),
                    ...txData.metadata
                }
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            return {
                recorded: true,
                blockchainTxId: response.data._id || response.data.id,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('[BlockchainService] recordTransaction error:', error.message);
            return { recorded: false, error: error.message };
        }
    }

    /**
     * Get comprehensive blockchain status
     */
    async getStatus() {
        const health = await this.healthCheck();
        const nodeStatus = await this.getNodeStatus();
        const blockchainInfo = await this.getBlockchainInfo();

        return {
            ...health,
            node: nodeStatus?.result || null,
            info: blockchainInfo?.default_node_info || null,
            syncEnabled: ENABLE_BLOCKCHAIN_SYNC
        };
    }
}

// Export singleton instance
const blockchainService = new BlockchainService();

// Initialize health check on startup
blockchainService.healthCheck().then(status => {
    console.log('[BlockchainService] Initial health check:', status);
}).catch(err => {
    console.warn('[BlockchainService] Initial health check failed:', err.message);
});

module.exports = blockchainService;
