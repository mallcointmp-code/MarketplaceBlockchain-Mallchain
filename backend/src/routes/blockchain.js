const express = require('express')
const router = express.Router()

const {
  getEmissionState,
  getTransactions,
  getMarketTrades,
  getMarketPrice,
  getStats,
} = require('../controllers/blockchainController')

// Proxy endpoints to blockchain REST API
router.get('/stats', getStats)
router.get('/emission-state', getEmissionState)
router.get('/transactions', getTransactions)
router.get('/market/trades', getMarketTrades)
router.get('/market/price', getMarketPrice)

module.exports = router
