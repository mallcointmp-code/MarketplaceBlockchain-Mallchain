const axios = require('axios')

const CHAIN_REST = process.env.CHAIN_REST_URL || process.env.VITE_CHAIN_REST || 'http://localhost:1317'

async function getMarketPrice(req, res) {
  try {
    const base = CHAIN_REST.replace(/\/$/, '')
    const url = `${base}/tmp/marketplace/mlcoin/v1/market/price`
    const resp = await axios.get(url, { timeout: 5000 })
    const data = resp.data || {}
    const mp = data.market_price || data.marketPrice || null
    if (!mp) return res.status(502).json({ error: 'no market price in chain response', raw: data })

    // buy_price and sell_price are integers scaled by 100 in chain proto
    const buy = Number(mp.buy_price) / 100
    const sell = Number(mp.sell_price) / 100

    return res.json({ market_price: { buy_price: buy, sell_price: sell, last_update_height: mp.last_update_height || null, raw: mp } })
  } catch (err) {
    return res.status(502).json({ error: 'failed to fetch on-chain market price', details: String(err) })
  }
}

module.exports = { getMarketPrice }
