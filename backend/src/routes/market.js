const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/marketController')

// GET /api/market/price
router.get('/price', ctrl.getMarketPrice)

module.exports = router
