const express = require('express');
const router = express.Router();
const governanceCtrl = require('../controllers/governanceController');

// List proposals
router.get('/proposals', governanceCtrl.listProposals);

// Get proposal details
router.get('/proposal/:id', governanceCtrl.getProposal);

// Vote on proposal
router.post('/vote', governanceCtrl.vote);

module.exports = router;
