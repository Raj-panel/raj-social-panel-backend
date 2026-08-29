const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/telegramController');

router.post('/webhook', handleWebhook);

module.exports = router;