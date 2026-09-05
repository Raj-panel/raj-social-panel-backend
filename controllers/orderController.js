const Order = require('../models/Order');

// ==========================================
// CREATE ORDER
// POST /api/orders/create
// Frontend → Backend → MongoDB → Telegram
// ==========================================
exports.createOrder = async (req, res) => {
  const requestStartTime = Date.now();

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

    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order amount.'
      });
    }

    // ------------------------------------------
    // 4. Validate quantity
    // ------------------------------------------
    const numericQuantity = Number(quantity);

    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order quantity.'
      });
    }

    // ------------------------------------------
    // 5. Generate internal order ID
    // ------------------------------------------
    const internalOrderId =
      'ORD-' +
      Date.now() +
      '-' +
      Math.floor(1000 + Math.random() * 9000);

    console.log(
      `🆔 [ORDER] Generated Order ID: ${internalOrderId}`
    );

    // ------------------------------------------
    // 6. Payment status
    // ------------------------------------------
    const finalPaymentStatus =
      paymentStatus ||
      (paymentId ? 'PAID' : 'PAYMENT_PENDING');

    const finalOrderStatus =
      orderStatus ||
      (finalPaymentStatus === 'PAID'
        ? 'PAID'
        : 'PAYMENT_PENDING');

    // ------------------------------------------
    // 7. Create MongoDB order
    // ------------------------------------------
    const newOrder = new Order({
      internalOrderId,

      userId,

      platform,

      serviceId: String(serviceId),

      serviceName,

      link,

      quantity: numericQuantity,

      amount: numericAmount,

      paymentId: paymentId || null,

      paymentStatus: finalPaymentStatus,

      providerOrderId: null,

      orderStatus: finalOrderStatus
    });

    console.log(
      `⏱️ [ORDER] MongoDB save started: ${
        Date.now() - requestStartTime
      } ms`
    );

    // ------------------------------------------
    // 8. Save order to MongoDB
    // ------------------------------------------
    await newOrder.save();

    console.log(
      `⏱️ [ORDER] MongoDB save completed: ${
        Date.now() - requestStartTime
      } ms`
    );

    console.log(
      `✅ [ORDER] Order saved to MongoDB: ${internalOrderId}`
    );

    // ==========================================
    // 9. SELECT TELEGRAM CREDENTIALS
    // ==========================================
    let botToken = null;
    let targetChatId = null;

    if (platform === 'platform1') {
      botToken = process.env.TELEGRAM_BOT_TOKEN_1;
      targetChatId = process.env.TELEGRAM_CHAT_ID_1;
    } else if (platform === 'platform2') {
      botToken = process.env.TELEGRAM_BOT_TOKEN_2;
      targetChatId = process.env.TELEGRAM_CHAT_ID_2;
    }

    // ==========================================
    // 10. PREPARE TELEGRAM MESSAGE
    // ==========================================
    if (botToken && targetChatId) {
      const telegramMessage =
        `🚀 NEW ORDER RECEIVED 🚀\n\n` +
        `🆔 Order ID: ${internalOrderId}\n` +
        `📌 Platform: ${platform}\n` +
        `🛠️ Service: ${serviceName}\n` +
        `📦 Package: ${packageName || 'N/A'}\n` +
        `🔢 Quantity: ${numericQuantity.toLocaleString()}\n` +
        `💰 Amount: ₹${numericAmount.toFixed(2)}\n` +
        `🔗 Link: ${link}\n` +
        `💳 Payment Method: ${paymentMethod || 'N/A'}\n` +
        `🧾 Transaction ID / UTR: ${paymentId || 'N/A'}\n` +
        `💵 Payment Status: ${finalPaymentStatus}\n` +
        `📋 Order Status: ${finalOrderStatus}`;

      // ==========================================
      // 11. START TELEGRAM REQUEST
      //
      // IMPORTANT:
      // There is NO await here.
      //
      // The customer response will NOT wait
      // for Telegram.
      // ==========================================
      console.log(
        `📤 [TELEGRAM] Starting background notification: ${internalOrderId}`
      );

      fetch(
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
      )
        .then(async (telegramResponse) => {
          try {
            const telegramData =
              await telegramResponse.json();

            if (telegramData.ok) {
              console.log(
                `✅ [TELEGRAM] Notification sent: ${internalOrderId}`
              );
            } else {
              console.error(
                `❌ [TELEGRAM] API error for ${internalOrderId}:`,
                telegramData
              );
            }
          } catch (error) {
            console.error(
              `❌ [TELEGRAM] Response parsing error for ${internalOrderId}:`,
              error.message
            );
          }
        })
        .catch((telegramError) => {
          console.error(
            `❌ [TELEGRAM] Connection error for ${internalOrderId}:`,
            telegramError.message
          );
        });

      console.log(
        `⚡ [ORDER] Telegram launched without waiting: ${
          Date.now() - requestStartTime
        } ms`
      );
    } else {
      console.warn(
        `⚠️ [TELEGRAM] Credentials missing for ${platform}`
      );
    }

    // ==========================================
    // 12. RETURN RESPONSE IMMEDIATELY
    // ==========================================
    const responseTime = Date.now() - requestStartTime;

    console.log(
      `🚀 [ORDER] RESPONSE READY IN: ${responseTime} ms`
    );

    return res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      order: newOrder,
      telegramSent: false
    });

  } catch (error) {
    console.error(
      '❌ [ORDER] Order Creation Error:',
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