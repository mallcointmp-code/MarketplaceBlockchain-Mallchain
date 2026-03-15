const express = require('express');
const router = express.Router();
const { createValidator } = require('../controllers/validatorController');
const auth = require('../middleware/auth');

router.post('/create', auth, createValidator);

module.exports = router;
