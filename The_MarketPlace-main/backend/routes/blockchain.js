// Blockchain routes - Expose blockchain functionality to marketplace frontend
const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchainService');

// Middleware to extract JWT token
const { authMiddleware: auth } = require('../middlewares/authMiddleware');

/**
 * GET /api/blockchain/status
 * Get blockchain service status
 */
router.get('/status', async (req, res) => {
    try {
        const status = await blockchainService.getStatus();
        res.json({ success: true, status });
    } catch (error) {
        console.error('[blockchain/status] error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'STATUS_ERROR', message: error.message }
        });
    }
});

/**
 * POST /api/blockchain/vault
 * Create a blockchain vault for the authenticated user
 */
router.post('/vault', auth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const { data } = req.body;
        const token = req.headers.authorization?.replace('Bearer ', '');

        const vault = await blockchainService.createVault(userId, data, token);

        res.json({
            success: true,
            vault,
            message: 'Blockchain vault created successfully'
        });
    } catch (error) {
        console.error('[blockchain/vault] create error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'VAULT_CREATE_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/blockchain/vault/:id
 * Get vault details
 */
router.get('/vault/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const token = req.headers.authorization?.replace('Bearer ', '');

        const vault = await blockchainService.getVault(id, token);

        res.json({ success: true, vault });
    } catch (error) {
        console.error('[blockchain/vault] get error:', error);
        res.status(404).json({
            success: false,
            error: { code: 'VAULT_NOT_FOUND', message: error.message }
        });
    }
});

/**
 * POST /api/blockchain/sign
 * Sign a transaction using blockchain vault
 */
router.post('/sign', auth, async (req, res) => {
    try {
        const { vaultId, data } = req.body;
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!vaultId || !data) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'vaultId and data are required' }
            });
        }

        const signature = await blockchainService.signTransaction(vaultId, data, token);

        res.json({
            success: true,
            signature,
            message: 'Transaction signed successfully'
        });
    } catch (error) {
        console.error('[blockchain/sign] error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SIGN_ERROR', message: error.message }
        });
    }
});

/**
 * POST /api/blockchain/sync-wallet
 * Synchronize marketplace wallet with blockchain vault
 */
router.post('/sync-wallet', auth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const token = req.headers.authorization?.replace('Bearer ', '');

        // Get user's wallet data
        const Wallet = require('../models/Wallet');
        const wallet = await Wallet.findOne({ user: userId });

        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: { code: 'WALLET_NOT_FOUND', message: 'User wallet not found' }
            });
        }

        const syncResult = await blockchainService.syncWallet(userId, {
            balance: wallet.balance,
            currency: 'KES'
        }, token);

        if (syncResult.synced) {
            // Update wallet with vault ID
            wallet.blockchainVaultId = syncResult.vaultId;
            wallet.lastBlockchainSync = syncResult.timestamp;
            await wallet.save();
        }

        res.json({
            success: true,
            sync: syncResult,
            message: syncResult.synced ? 'Wallet synchronized with blockchain' : 'Sync failed'
        });
    } catch (error) {
        console.error('[blockchain/sync-wallet] error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SYNC_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/blockchain/node
 * Get blockchain node information
 */
router.get('/node', async (req, res) => {
    try {
        const nodeStatus = await blockchainService.getNodeStatus();
        const blockchainInfo = await blockchainService.getBlockchainInfo();

        res.json({
            success: true,
            node: {
                status: nodeStatus?.result || null,
                info: blockchainInfo?.default_node_info || null
            }
        });
    } catch (error) {
        console.error('[blockchain/node] error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'NODE_ERROR', message: error.message }
        });
    }
});

/**
 * POST /api/blockchain/record-transaction
 * Record a marketplace transaction on blockchain
 */
router.post('/record-transaction', auth, async (req, res) => {
    try {
        const { transactionId } = req.body;
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!transactionId) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'transactionId is required' }
            });
        }

        // Get transaction from ledger
        const Ledger = require('../models/Ledger');
        const transaction = await Ledger.findById(transactionId);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found' }
            });
        }

        const recordResult = await blockchainService.recordTransaction({
            id: transaction._id.toString(),
            type: transaction.type,
            amount: transaction.amount,
            from: transaction.from?.toString(),
            to: transaction.to?.toString(),
            createdAt: transaction.createdAt,
            metadata: transaction.metadata
        }, token);

        if (recordResult.recorded) {
            // Update transaction with blockchain reference
            transaction.blockchainTxId = recordResult.blockchainTxId;
            transaction.blockchainRecordedAt = recordResult.timestamp;
            await transaction.save();
        }

        res.json({
            success: true,
            record: recordResult,
            message: recordResult.recorded ? 'Transaction recorded on blockchain' : 'Recording failed'
        });
    } catch (error) {
        console.error('[blockchain/record-transaction] error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'RECORD_ERROR', message: error.message }
        });
    }
});

module.exports = router;
