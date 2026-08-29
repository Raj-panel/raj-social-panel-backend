const Order = require('../models/Order');

// অর্ডার তৈরি করার কন্ট্রোলার (POST /api/orders/create)
exports.createOrder = async (req, res) => {
  try {
    const { userId, platform, serviceId, serviceName, link, quantity, amount } = req.body;

    if (!userId || !platform || !serviceId || !link || !quantity) {
      return res.status(400).json({ success: false, message: 'প্রয়োজনীয় ফিল্ডগুলো পূরণ করা হয়নি।' });
    }

    // ইউনিক ইন্টারনাল অর্ডার আইডি জেনারেট (Duplicate Prevent)
    const internalOrderId = 'ORD-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);

    const newOrder = new Order({
      internalOrderId,
      userId,
      platform,
      serviceId,
      serviceName,
      link,
      quantity,
      amount: amount || 0,
      paymentStatus: 'PAYMENT_PENDING',
      orderStatus: 'PAYMENT_PENDING'
    });

    await newOrder.save();

    // প্ল্যাটফর্ম অনুযায়ী Telegram নোটিফিকেশন পাঠানো
    let botToken;
    let targetChatId;

    if (platform === 'platform1') {
      botToken = process.env.TELEGRAM_BOT_TOKEN_1;
      targetChatId = process.env.TELEGRAM_CHAT_ID_1;
    } else if (platform === 'platform2') {
      botToken = process.env.TELEGRAM_BOT_TOKEN_2;
      targetChatId = process.env.TELEGRAM_CHAT_ID_2;
    }

    if (botToken && targetChatId) {
      const message =
        `📦 New Order Received!\n` +
        `----------------------\n` +
        `🆔 Order ID: ${internalOrderId}\n` +
        `🌐 Platform: ${platform.toUpperCase()}\n` +
        `🛠️ Service: ${serviceName}\n` +
        `🔢 Quantity: ${quantity}\n` +
        `🔗 Link: ${link}\n` +
        `💵 Price: ${amount}`;

      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: targetChatId, text: message })
      }).catch(err => console.error('Telegram notification error:', err));
    }

    return res.status(201).json({
      success: true,
      message: 'অর্ডার সফলভাবে তৈরি হয়েছে।',
      order: newOrder
    });
  } catch (error) {
    console.error('Order Creation Error:', error);
    return res.status(500).json({ success: false, message: 'সার্ভার এরর হয়েছে।' });
  }
};

// ইউজার ভিত্তিক অর্ডার লিস্ট পাওয়ার কন্ট্রোলার (GET /api/orders/user/:userId)
exports.getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const { platform } = req.query;

    const query = { userId };
    if (platform) query.platform = platform;

    const orders = await Order.find(query).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Fetch Orders Error:', error);
    return res.status(500).json({ success: false, message: 'সার্ভার এরর হয়েছে।' });
  }
};