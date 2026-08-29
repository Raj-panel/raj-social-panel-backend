const express = require('express');
const router = express.Router();
const { generateWhatsAppLink } = require('../controllers/whatsappController');

router.post('/generate-link', generateWhatsAppLink);

module.exports = router;