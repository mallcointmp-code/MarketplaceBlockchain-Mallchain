const express = require('express');
const router = express.Router();
const stakingCtrl = require('../controllers/stakingController');
const auth = require('../middleware/auth');

// Get staking info for an address (GET or POST for mnemonic/publicKey)
router.get('/info/:address', stakingCtrl.info);
router.post('/info/:address', stakingCtrl.info);

// Delegate tokens
router.post('/delegate', auth, stakingCtrl.delegate);

// Undelegate tokens
router.post('/undelegate', auth, stakingCtrl.undelegate);

// Claim staking rewards
router.post('/claim', auth, stakingCtrl.claim);

module.exports = router;
