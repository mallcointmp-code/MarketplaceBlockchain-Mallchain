require('dotenv').config()
const express = require('express')
const cors = require('cors')
const axios = require('axios')

const app = express()
app.use(cors())
app.use(express.json())

const CHAIN_REST = process.env.CHAIN_REST || 'http://127.0.0.1:1317'

app.get('/health', (_req, res) => res.json({ ok: true }))

// Query Cosmos-style REST for bank balances. Returns first coin amount or 0.
app.get('/balance/:address', async (req, res) => {
  try {
    const url = `${CHAIN_REST}/cosmos/bank/v1beta1/balances/${req.params.address}`
    const r = await axios.get(url, { timeout: 5000 })
    const data = r.data || {}
    if (data && data.balances && data.balances.length) {
      // Try to find MLCNS or mlc token; fall back to first denom
      const found = data.balances.find(b => /mlc/i.test(b.denom)) || data.balances[0]
      const amount = (found && found.amount) ? found.amount : '0'
      // Convert to human-friendly format if needed; assume the denom uses 6 decimals
      // For now, return raw amount as string
      return res.json({ balance: amount })
    }
    return res.json({ balance: '0' })
  } catch (e) {
    console.error('mallwallet REST balance error', e && e.message ? e.message : e)
    try {
      res.json({ balance: '0' })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  }
})

app.listen(process.env.PORT || 4000, () => {
  console.log('Wallet backend running on', process.env.PORT || 4000)
})
