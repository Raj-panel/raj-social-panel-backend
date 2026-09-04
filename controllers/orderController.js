const Order = require('../models/Order');

// ==========================================
// CREATE ORDER
// POST /api/orders/create
// Frontend → Backend → MongoDB → Telegram
// ==========================================
exports.createOrder = async (req, res) => {
  try {
    const {
      userId,
      platform,
      serviceId,
      serviceName,
      packageName,
      link,
      quantity,
      amount,
      paymentId,
      paymentMethod,
      paymentStatus,
      orderStatus
    } = req.body;

    // ------------------------------------------
    // 1. Required fields validation
    // ------------------------------------------
    if (
      !userId ||
      !platform ||
      !serviceId ||
      !serviceName ||
      !link ||
      !quantity
    ) {
      return res.status(400).json({
        success: false,
        message: 'Required order fields are missing.'
      });
    }

    // ------------------------------------------
    // 2. Validate platform
    // ------------------------------------------
    if (!['platform1', 'platform2'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform.'
      });
    }

    // ------------------------------------------
    // 3. Validate amount
    // ------------------------------------------
    const numericAmount = Number(amount || 0);

    if (numericAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order amount.'
      });
    }

    // ------------------------------------------
    // 4. Generate internal order ID
    // ------------------------------------------
    const internalOrderId =
      'ORD-' +
      Date.now() +
      '-' +
      Math.floor(1000 + Math.random() * 9000);

    // ------------------------------------------
    // 5. Payment status
    // ------------------------------------------
    const finalPaymentStatus =
      paymentStatus || (paymentId ? 'PAID' : 'PAYMENT_PENDING');

    const finalOrderStatus =
      orderStatus || (
        finalPaymentStatus === 'PAID'
          ? 'PAID'
          : 'PAYMENT_PENDING'
      );

    // ------------------------------------------
    // 6. Create MongoDB order
    // ------------------------------------------
    const newOrder = new Order({
      internalOrderId,

      userId,

      platform,

      serviceId: String(serviceId),

      serviceName,

      link,

      quantity: Number(quantity),

      amount: numericAmount,

      paymentId: paymentId || null,

      paymentStatus: finalPaymentStatus,

      providerOrderId: null,

      orderStatus: finalOrderStatus
    });

    // ------------------------------------------
    // 7. Save order to MongoDB
    // ------------------------------------------
    await newOrder.save();

    console.log(
      `✅ Order saved to MongoDB: ${internalOrderId}`
    );

    // ------------------------------------------
    // 8. Select Telegram credentials
    // ------------------------------------------
    let botToken = null;
    let targetChatId = null;

    if (platform === 'platform1') {
      botToken = process.env.TELEGRAM_BOT_TOKEN_1;
      targetChatId = process.env.TELEGRAM_CHAT_ID_1;
    }

    if (platform === 'platform2') {
      botToken = process.env.TELEGRAM_BOT_TOKEN_2;
      targetChatId = process.env.TELEGRAM_CHAT_ID_2;
    }

    // ------------------------------------------
    // 9. Send Telegram notification
    // ------------------------------------------
    let telegramSent = false;

    if (botToken && targetChatId) {

      const telegramMessage =
        `🚀 NEW ORDER RECEIVED 🚀\n\n` +
        `🆔 Order ID: ${internalOrderId}\n` +
        `📌 Platform: ${platform}\n` +
        `🛠️ Service: ${serviceName}\n` +
        `📦 Package: ${packageName || 'N/A'}\n` +
        `🔢 Quantity: ${Number(quantity).toLocaleString()}\n` +
        `💰 Amount: ₹${numericAmount.toFixed(2)}\n` +
        `🔗 Link: ${link}\n` +
        `💳 Payment Method: ${paymentMethod || 'N/A'}\n` +
        `🧾 Transaction ID / UTR: ${paymentId || 'N/A'}\n` +
        `💵 Payment Status: ${finalPaymentStatus}\n` +
        `📋 Order Status: ${finalOrderStatus}`;

      try {

        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: 'POST',

            headers: {
              'Content-Type': 'application/json'
            },

            body: JSON.stringify({
              chat_id: targetChatId,
              text: telegramMessage
            })
          }
        );

        const telegramData =
          await telegramResponse.json();

        if (telegramData.ok) {

          telegramSent = true;

          console.log(
            `✅ Telegram notification sent: ${internalOrderId}`
          );

        } else {

          console.error(
            '❌ Telegram API Error:',
            telegramData
          );
        }

      } catch (telegramError) {

        console.error(
          '❌ Telegram connection error:',
          telegramError
        );
      }

    } else {

      console.warn(
        '⚠️ Telegram credentials are missing for:',
        platform
      );
    }

    // ------------------------------------------
    // 10. Return response to Frontend
    // ------------------------------------------
    return res.status(201).json({
      success: true,

      message: 'Order created successfully.',

      order: newOrder,

      telegramSent
    });

  } catch (error) {

    console.error(
      '❌ Order Creation Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Server error while creating order.'
    });
  }
};


// ==========================================
// GET USER ORDERS
// GET /api/orders/user/:userId
// ==========================================
exports.getUserOrders = async (req, res) => {

  try {

    const { userId } = req.params;

    const { platform } = req.query;

    const query = {
      userId
    };

    if (platform) {
      query.platform = platform;
    }

    const orders = await Order
      .find(query)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      orders
    });

  } catch (error) {

    console.error(
      '❌ Fetch Orders Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching orders.'
    });
  }
};