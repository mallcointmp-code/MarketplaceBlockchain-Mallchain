const axios = require('axios');

const CHAIN_RPC = process.env.CHAIN_RPC || 'http://localhost:26657';
const CHAIN_REST = (process.env.CHAIN_REST_URL || process.env.CHAIN_REST || process.env.VITE_CHAIN_REST || 'http://localhost:1317').replace(/\/$/, '');

/**
 * Send mallcoins from one wallet to another
 * POST /api/send/mallcoins
 * Body: { from, to, amount, txBytes (optional, pre-signed) }
 */
exports.sendMallcoins = async (req, res) => {
  try {
    const { from, to, amount, txBytes } = req.body;

    // Validate inputs
    if (!from || !to || !amount) {
      return res.status(400).json({ error: 'Missing required fields: from, to, amount' });
    }

    if (!txBytes) {
      return res.status(400).json({ error: 'txBytes required - transaction must be signed by frontend' });
    }

    console.log(`[Send] Processing mallcoin transfer: ${from} -> ${to}, amount: ${amount}`);

    // Log txBytes shape to debug broadcast issues
    const txBytesPreview = typeof txBytes === 'string'
      ? `${txBytes.slice(0, 24)}... (len=${txBytes.length})`
      : Array.isArray(txBytes)
        ? `Uint8Array-like length=${txBytes.length}`
        : `type=${typeof txBytes}`;
    console.log(`[Send] txBytes preview: ${txBytesPreview}`);

    // Broadcast signed transaction to blockchain
    const broadcastUrl = `${CHAIN_REST.replace(/\/$/, '')}/cosmos/tx/v1beta1/txs`;
    // Ensure we hand the chain a base64 string; if an array slipped through, encode it.
    let txBytesBase64 = txBytes;
    if (Array.isArray(txBytes)) {
      txBytesBase64 = Buffer.from(Uint8Array.from(txBytes)).toString('base64');
    }
    if (typeof txBytesBase64 !== 'string') {
      return res.status(400).json({ error: 'txBytes must be base64 string' });
    }

    // Validate base64 before broadcasting to avoid chain 400s
    try {
      Buffer.from(txBytesBase64, 'base64');
    } catch (decodeErr) {
      console.error('[Send] txBytes not valid base64:', decodeErr.message);
      return res.status(400).json({ error: 'txBytes is not valid base64', detail: decodeErr.message });
    }

    const broadcastPayload = {
      tx_bytes: txBytesBase64,  // Base64-encoded signed transaction
      mode: 'BROADCAST_MODE_SYNC'
    };

    console.log(`[Send] Broadcasting to ${broadcastUrl}`);
    let chainResp = {};
    try {
      const broadcastResp = await axios.post(broadcastUrl, broadcastPayload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      chainResp = broadcastResp.data || {};
    } catch (broadcastErr) {
      const status = broadcastErr.response?.status;
      const data = broadcastErr.response?.data;
      console.error(`[Send] Broadcast HTTP error ${status}:`, JSON.stringify(data || broadcastErr.message));
      return res.status(500).json({
        error: 'Broadcast failed',
        status,
        details: data || broadcastErr.message
      });
    }
    const txHash = chainResp.tx_response?.txhash || chainResp.txhash;
    const code = chainResp.tx_response?.code || chainResp.code;

    if (code && code !== 0) {
      console.error(`[Send] Transaction failed with code ${code}: ${chainResp.tx_response?.raw_log || chainResp.raw_log}`);
      return res.status(400).json({
        success: false,
        error: 'Transaction failed',
        code,
        log: chainResp.tx_response?.raw_log || chainResp.raw_log,
        details: chainResp
      });
    }

    console.log(`[Send] Transaction broadcast: ${txHash}`);

    return res.json({
      success: true,
      txHash,
      from,
      to,
      amount,
      network: 'mallchain-1'
    });

  } catch (err) {
    console.error('[Send] Error:', err.message || err);
    
    // Handle connection refused (chain offline)
    if (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED')) {
      return res.status(503).json({
        error: 'Blockchain not responding',
        message: 'Please ensure the blockchain is running'
      });
    }

    return res.status(500).json({
      error: 'Failed to broadcast transaction',
      message: err.message
    });
  }
};

/**
 * Process payment using mallcoins
 * POST /api/send/payment
 * Body: { buyerAddress, sellerAddress, amountKES, description }
 */
exports.processPayment = async (req, res) => {
  try {
    const { buyerAddress, sellerAddress, amountKES, txBytes, description } = req.body;

    // Validate inputs
    if (!buyerAddress || !sellerAddress || !amountKES) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!txBytes) {
      return res.status(400).json({ error: 'Payment must be signed by frontend' });
    }

    console.log(`[Payment] Processing: ${buyerAddress} -> ${sellerAddress}, ${amountKES} KES`);

    // Get current price
    try {
      const priceUrl = `${CHAIN_REST.replace(/\/$/, '')}/tmp/marketplace/mlcoin/v1/market/price`;
      const priceResp = await axios.get(priceUrl, { timeout: 3000 });
      const mp = priceResp.data?.market_price || {};
      const buyPrice = Number(mp.buy_price || 39) / 100;  // Default to 0.39 KES
      const amountMLCN = amountKES / buyPrice;
      
      console.log(`[Payment] Price: ${buyPrice} KES/MLCN, Amount: ${amountMLCN} MLCN`);
    } catch (e) {
      console.log(`[Payment] Could not fetch price: ${e.message}`);
    }

    // Broadcast signed transaction to blockchain
    const broadcastUrl = `${CHAIN_REST.replace(/\/$/, '')}/cosmos/tx/v1beta1/txs`;
    const broadcastPayload = {
      tx_bytes: txBytes,
      mode: 'BROADCAST_MODE_SYNC'
    };

    console.log(`[Payment] Broadcasting to ${broadcastUrl}`);
    const broadcastResp = await axios.post(broadcastUrl, broadcastPayload, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });

    const chainResp = broadcastResp.data || {};
    const txHash = chainResp.tx_response?.txhash || chainResp.txhash;
    const code = chainResp.tx_response?.code || chainResp.code;

    if (code && code !== 0) {
      console.error(`[Payment] Transaction failed: ${chainResp.tx_response?.raw_log}`);
      return res.status(400).json({
        success: false,
        error: 'Payment failed',
        code,
        log: chainResp.tx_response?.raw_log
      });
    }

    console.log(`[Payment] Payment confirmed: ${txHash}`);

    return res.json({
      success: true,
      txHash,
      buyer: buyerAddress,
      seller: sellerAddress,
      amountKES,
      description
    });

  } catch (err) {
    console.error('[Payment] Error:', err.message || err);
    return res.status(500).json({
      error: 'Payment processing failed',
      message: err.message
    });
  }
};

/**
 * Get transaction status from blockchain
 * GET /api/send/status/:txHash
 */
exports.getTransactionStatus = async (req, res) => {
  try {
    const { txHash } = req.params;

    if (!txHash || txHash.length === 0) {
      return res.status(400).json({ error: 'Transaction hash required' });
    }

    // Query transaction from blockchain
    const txUrl = `${CHAIN_REST.replace(/\/$/, '')}/cosmos/tx/v1beta1/txs/${txHash}`;
    
    try {
      const txResp = await axios.get(txUrl, { timeout: 3000 });
      const tx = txResp.data?.tx_response || {};
      
      return res.json({
        success: true,
        hash: txHash,
        height: tx.height,
        code: tx.code,
        status: tx.code === 0 ? 'confirmed' : 'failed',
        gasUsed: tx.gas_used,
        gasWanted: tx.gas_wanted,
        timestamp: tx.timestamp
      });
    } catch (e) {
      if (e.response?.status === 404) {
        return res.json({
          success: false,
          hash: txHash,
          status: 'pending',
          message: 'Transaction not yet on chain'
        });
      }
      throw e;
    }

  } catch (err) {
    console.error('[TX Status] Error:', err.message);
    return res.status(500).json({
      error: 'Failed to fetch transaction status',
      message: err.message
    });
  }
};

/**
 * Fetch account metadata (account_number and sequence) for signing
 * GET /api/send/account/:address
 */
exports.getAccountInfo = async (req, res) => {
  try {
    const { address } = req.params;
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const accountUrl = `${CHAIN_REST}/cosmos/auth/v1beta1/accounts/${address}`;
    const resp = await axios.get(accountUrl, { timeout: 5000 }).catch((e) => {
      if (e.response?.status === 404) return { data: { account: null }, notFound: true };
      throw e;
    });
    const account = resp.data?.account;

    // If account does not exist yet, return zeros so offline signing can still proceed
    if (!account) {
      return res.json({ success: true, accountNumber: 0, sequence: 0, pubkey: null, notFound: true });
    }

    const baseAccount = account.base_account || account;
    const accountNumber = Number(baseAccount.account_number ?? account.account_number);
    const sequence = Number(baseAccount.sequence ?? account.sequence);
    const pubkey = baseAccount.pub_key || account.pub_key || null;

    if (Number.isNaN(accountNumber) || Number.isNaN(sequence)) {
      return res.status(500).json({ error: 'Failed to parse account metadata from chain response' });
    }

    return res.json({
      success: true,
      accountNumber,
      sequence,
      pubkey,
      notFound: false,
    });
  } catch (err) {
    console.error('[AccountInfo] Error:', err.message || err);
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Account not found on chain' });
    }
    return res.status(500).json({ error: 'Failed to fetch account info', message: err.message });
  }
};
