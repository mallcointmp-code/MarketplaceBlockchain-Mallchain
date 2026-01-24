const axios = require('axios')

const CHAIN_REST = process.env.CHAIN_REST_URL || process.env.VITE_CHAIN_REST || 'http://localhost:1317'

// In-memory price history (kept as milliseconds epoch and mid price as decimal)
// This collector polls the chain REST `/tmp/marketplace/mlcoin/v1/market/price` regularly
// and stores a bounded history used by the frontend for range calculations.
const priceHistory = []
const PRICE_HISTORY_RETENTION_MS = 1000 * 60 * 60 * 24 * 31 * 6 // ~6 months
const PRICE_POLL_INTERVAL_MS = 15 * 1000

async function pollChainPriceOnce() {
  try {
    const base = CHAIN_REST.replace(/\/$/, '')
    const url = `${base}/tmp/marketplace/mlcoin/v1/market/price`
    const resp = await axios.get(url, { timeout: 5000 })
    const data = resp.data || {}
    const mp = data.market_price || data.marketPrice || null
    if (!mp) return
    const buy = Number(mp.buy_price) / 100
    const sell = Number(mp.sell_price) / 100
    const mid = ((buy || 0) + (sell || 0)) / 2
    priceHistory.push({ ts: Date.now(), mid })
    // prune
    const cutoff = Date.now() - PRICE_HISTORY_RETENTION_MS
    while (priceHistory.length && priceHistory[0].ts < cutoff) priceHistory.shift()
  } catch (err) {
    // ignore polling errors; history remains as-is
  }
}

// start background poller
setInterval(pollChainPriceOnce, PRICE_POLL_INTERVAL_MS)
// initial fill
pollChainPriceOnce().catch(() => {})

function aggregateChangeForRange(rangeMs) {
  if (!priceHistory.length) return null
  const now = Date.now()
  const latest = priceHistory[priceHistory.length - 1]
  const cutoff = now - rangeMs
  let past = null
  for (let i = priceHistory.length - 1; i >= 0; i--) {
    if (priceHistory[i].ts <= cutoff) { past = priceHistory[i]; break }
  }
  if (!past) past = priceHistory[0]
  if (!past || past.mid === 0) return null
  const pct = ((latest.mid - past.mid) / past.mid) * 100
  return { pct, latest: latest.mid, past: past.mid }
}

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

    const latestMid = ((buy || 0) + (sell || 0)) / 2

    // keep in-memory history fresh: append if the poller hasn't yet recorded this sample
    const now = Date.now()
    const last = priceHistory.length ? priceHistory[priceHistory.length - 1] : null
    if (!last || (now - last.ts) > Math.max(5000, PRICE_POLL_INTERVAL_MS - 1000)) {
      priceHistory.push({ ts: now, mid: latestMid })
      // prune if necessary
      const cutoff = Date.now() - PRICE_HISTORY_RETENTION_MS
      while (priceHistory.length && priceHistory[0].ts < cutoff) priceHistory.shift()
    }

    // return a bounded recent history and aggregated percent changes for common ranges
    const recent = priceHistory.slice(-500) // last up to 500 samples
    const ranges = {
      '5m': 5 * 60 * 1000,
      '10m': 10 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '15d': 15 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '5M': 5 * 30 * 24 * 60 * 60 * 1000
    }
    const aggregates = {}
    Object.keys(ranges).forEach(k => {
      const agg = aggregateChangeForRange(ranges[k])
      aggregates[k] = agg
    })

    return res.json({ market_price: { buy_price: buy, sell_price: sell, mid: latestMid, last_update_height: mp.last_update_height || null, raw: mp }, history: recent, aggregates })
  } catch (err) {
    return res.status(502).json({ error: 'failed to fetch on-chain market price', details: String(err) })
  }
}

async function getTotalSupply(req, res) {
  try {
    const base = CHAIN_REST.replace(/\/$/, '')
    const url = `${base}/tmp/marketplace/mlcoin/v1/emission_state`
    const resp = await axios.get(url, { timeout: 5000 })
    const data = resp.data || {}
    const es = data.emission_state || data.emissionState || null
    if (!es) return res.status(502).json({ error: 'no emission_state in chain response', raw: data })

    // total_supply is an integer (uint64). On-chain value is in base units
    // (scaled by 1e6). Convert to human-readable Mallcoins by dividing by 1_000_000.
    const raw = Number(es.total_supply || es.totalSupply || 0)
    const supply = raw / 1_000_000

    // circulating is also provided as a uint64 string in the proto; scale the same way
    const rawCirculating = Number(es.circulating || es.circulating_supply || 0)
    const circulating = rawCirculating / 1_000_000

    return res.json({ total_supply: { raw: raw, supply: supply, circulating_raw: rawCirculating, circulating: circulating, raw_proto: es } })
  } catch (err) {
    return res.status(502).json({ error: 'failed to fetch on-chain emission_state', details: String(err) })
  }
}

async function getMonthlyEmissions(req, res) {
  try {
    const base = CHAIN_REST.replace(/\/$/, '')
    const url = `${base}/tmp/marketplace/mlcoin/v1/emission_state`
    const resp = await axios.get(url, { timeout: 5000 })
    const data = resp.data || {}
    const es = data.emission_state || data.emissionState || null
    if (!es) return res.status(502).json({ error: 'no emission_state in chain response', raw: data })

    // monthly_cap is provided in base units (1e6). Return a 12-month array using the on-chain cap.
    const rawMonthly = Number(es.monthly_cap || es.monthlyCap || 0)
    const monthly = rawMonthly / 1_000_000

    const months = []
    const currentMonthOnChain = Number(es.current_month || es.currentMonth || 0)
    for (let m = 1; m <= 12; m++) {
      const has_emitted = currentMonthOnChain >= m && monthly > 0
      months.push({ month: m, supply: monthly, has_emitted })
    }

    return res.json({ months, raw_proto: es })
  } catch (err) {
    return res.status(502).json({ error: 'failed to fetch on-chain emission_state', details: String(err) })
  }
}

module.exports = { getMarketPrice, getTotalSupply, getMonthlyEmissions }

