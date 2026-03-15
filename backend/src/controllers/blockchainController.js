const axios = require('axios')

const CHAIN_REST = process.env.CHAIN_REST_URL || process.env.VITE_CHAIN_REST || 'http://localhost:1317'

// Proxy fetch to blockchain endpoints to avoid CORS issues
async function getEmissionState(req, res) {
  try {
    const base = CHAIN_REST.replace(/\/$/, '')
    const url = `${base}/tmp/marketplace/mlcoin/v1/emission_state`
    const response = await axios.get(url, { timeout: 5000 })
    return res.json(response.data)
  } catch (err) {
    console.error('Failed to fetch emission state:', err.message)
    return res.status(500).json({ error: 'Failed to fetch emission state', details: String(err) })
  }
}

async function getTransactions(req, res) {
  try {
    const base = CHAIN_REST.replace(/\/$/, '')
    const url = `${base}/tmp/marketplace/mlcoin/v1/transactions`
    const response = await axios.get(url, { timeout: 5000 })
    return res.json(response.data)
  } catch (err) {
    console.error('Failed to fetch transactions:', err.message)
    return res.status(500).json({ error: 'Failed to fetch transactions', details: String(err) })
  }
}

async function getMarketTrades(req, res) {
  try {
    const base = CHAIN_REST.replace(/\/$/, '')
    const url = `${base}/tmp/marketplace/mlcoin/v1/market/trades`
    const response = await axios.get(url, { timeout: 5000 })
    return res.json(response.data)
  } catch (err) {
    console.error('Failed to fetch market trades:', err.message)
    return res.status(500).json({ error: 'Failed to fetch market trades', details: String(err) })
  }
}

async function getMarketPrice(req, res) {
  try {
    const base = CHAIN_REST.replace(/\/$/, '')
    const url = `${base}/tmp/marketplace/mlcoin/v1/market/price`
    const response = await axios.get(url, { timeout: 5000 })
    return res.json(response.data)
  } catch (err) {
    console.error('Failed to fetch market price:', err.message)
    return res.status(500).json({ error: 'Failed to fetch market price', details: String(err) })
  }
}

async function getStats(req, res) {
  try {
    const base = CHAIN_REST.replace(/\/$/, '')
    
    // Fetch node info
    const nodeRes = await axios.get(`${base}/cosmos/base/tendermint/v1beta1/node_info`, { timeout: 5000 })
    const chainId = nodeRes.data?.default_node_info?.network || 'unknown'
    const moniker = nodeRes.data?.default_node_info?.moniker || 'unknown'
    
    // Fetch latest block
    const blockRes = await axios.get(`${base}/cosmos/base/tendermint/v1beta1/blocks/latest`, { timeout: 5000 })
    const latestHeight = blockRes.data?.block?.header?.height || '0'
    const txCount = blockRes.data?.block?.data?.txs?.length || 0
    
    return res.json({
      chain: chainId,
      latestHeight: latestHeight,
      txCount: txCount,
      moniker: moniker,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('Failed to fetch blockchain stats:', err.message)
    return res.status(500).json({ error: 'Failed to fetch blockchain stats', details: String(err) })
  }
}

module.exports = {
  getEmissionState,
  getTransactions,
  getMarketTrades,
  getMarketPrice,
  getStats,
}
