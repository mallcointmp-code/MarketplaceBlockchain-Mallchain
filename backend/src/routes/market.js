const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/marketController')

// GET /api/market/price
router.get('/price', ctrl.getMarketPrice)
// GET /api/market/supply
router.get('/supply', ctrl.getTotalSupply)

module.exports = router
