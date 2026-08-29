const express = require('express');
const router = express.Router();
const { createOrder, getUserOrders } = require('../controllers/orderController');

router.post('/create', createOrder);
router.get('/user/:userId', getUserOrders);

module.exports = router;