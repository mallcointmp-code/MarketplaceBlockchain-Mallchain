const express = require('express');
const router = express.Router();
const txCtrl = require('../controllers/txController');
const auth = require('../middleware/auth');

router.get('/', txCtrl.list);
router.get('/:id', txCtrl.get);
// Relay signed txs (public endpoint)
router.post('/relay', txCtrl.relay);

// Authenticated create
router.post('/', auth, txCtrl.create);

module.exports = router;
