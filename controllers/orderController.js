const Order = require('../models/Order');

// ==========================================
// SEND TELEGRAM NOTIFICATION
// ==========================================
async function sendTelegramNotification({
  botToken,
  chatId,
  message,
  internalOrderId,
  platform
}) {
  if (!botToken || !chatId) {
    console.error(
      `❌ [TELEGRAM] Missing credentials for ${platform}`
    );

    return {
      success: false,
      reason: 'MISSING_CREDENTIALS'
    };
  }

  const telegramUrl =
    `https://api.telegram.org/bot${botToken}/sendMessage`;

  const controller = new AbortController();

  // Telegram request maximum wait time: 8 seconds
  const timeout = setTimeout(() => {
    controller.abort();
  }, 8000);

  try {
    console.log(
      `📤 [TELEGRAM] Sending notification for ${internalOrderId}`
    );

    const telegramStart = Date.now();

    const response = await fetch(telegramUrl, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        chat_id: chatId,
        text: message
      }),

      signal: controller.signal
    });

    const responseTime = Date.now() - telegramStart;

    console.log(
      `⏱️ [TELEGRAM] API response received in ${responseTime} ms`
    );

    let data;

    try {
      data = await response.json();
    } catch (jsonError) {
      console.error(
        `❌ [TELEGRAM] Invalid JSON response for ${internalOrderId}`
      );

      return {
        success: false,
        reason: 'INVALID_RESPONSE'
      };
    }

    // ------------------------------------------
    // Telegram API success
    // ------------------------------------------
    if (response.ok && data.ok === true) {
      console.log(
        `✅ [TELEGRAM] Notification sent successfully: ${internalOrderId}`
      );

      return {
        success: true,
        telegramResponse: data
      };
    }

    // ------------------------------------------
    // Telegram API returned an error
    // ------------------------------------------
    console.error(
      `❌ [TELEGRAM] API Error for ${internalOrderId}:`,
      data
    );

    return {
      success: false,
      reason: 'TELEGRAM_API_ERROR',
      telegramResponse: data
    };

  } catch (error) {

    if (error.name === 'AbortError') {
      console.error(
        `❌ [TELEGRAM] Request timeout after 8 seconds: ${internalOrderId}`
      );

      return {
        success: false,
        reason: 'TELEGRAM_TIMEOUT'
      };
    }

    console.error(
      `❌ [TELEGRAM] Connection error for ${internalOrderId}:`,
      error.message
    );

    return {
      success: false,
      reason: 'TELEGRAM_CONNECTION_ERROR',
      error: error.message
    };

  } finally {
    clearTimeout(timeout);
  }
}


// ==========================================
// CREATE ORDER
// POST /api/orders/create
//
// Frontend
//    ↓
// Backend
//    ↓
// MongoDB
//    ↓
// Telegram
//    ↓
// Response
// ==========================================
exports.createOrder = async (req, res) => {
  const requestStartTime = Date.now();

  try {

    // ==========================================
    // 1. GET REQUEST DATA
    // ==========================================
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

    console.log(
      `⏱️ [ORDER] Request started: ${
        Date.now() - requestStartTime
      } ms`
    );


    // ==========================================
    // 2. REQUIRED FIELD VALIDATION
    // ==========================================
    if (
      !userId ||
      !platform ||
      !serviceId ||
      !serviceName ||
      !link ||
      !quantity
    ) {
      console.error(
        '❌ [ORDER] Required fields are missing'
      );

      return res.status(400).json({
        success: false,
        message: 'Required order fields are missing.'
      });
    }

    console.log(
      `⏱️ [ORDER] Validation completed: ${
        Date.now() - requestStartTime
      } ms`
    );


    // ==========================================
    // 3. VALIDATE PLATFORM
    // ==========================================
    if (
      platform !== 'platform1' &&
      platform !== 'platform2'
    ) {
      console.error(
        `❌ [ORDER] Invalid platform: ${platform}`
      );

      return res.status(400).json({
        success: false,
        message: 'Invalid platform.'
      });
    }


    // ==========================================
    // 4. VALIDATE AMOUNT
    // ==========================================
    const numericAmount = Number(amount || 0);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < 0
    ) {
      console.error(
        `❌ [ORDER] Invalid amount: ${amount}`
      );

      return res.status(400).json({
        success: false,
        message: 'Invalid order amount.'
      });
    }


    // ==========================================
    // 5. VALIDATE QUANTITY
    // ==========================================
    const numericQuantity = Number(quantity);

    if (
      !Number.isFinite(numericQuantity) ||
      numericQuantity <= 0
    ) {
      console.error(
        `❌ [ORDER] Invalid quantity: ${quantity}`
      );

      return res.status(400).json({
        success: false,
        message: 'Invalid order quantity.'
      });
    }


    // ==========================================
    // 6. GENERATE INTERNAL ORDER ID
    // ==========================================
    const internalOrderId =
      'ORD-' +
      Date.now() +
      '-' +
      Math.floor(
        1000 + Math.random() * 9000
      );

    console.log(
      `🆔 [ORDER] Generated Order ID: ${internalOrderId}`
    );


    // ==========================================
    // 7. PAYMENT STATUS
    // ==========================================
    const finalPaymentStatus =
      paymentStatus ||
      (paymentId
        ? 'PAID'
        : 'PAYMENT_PENDING');

    const finalOrderStatus =
      orderStatus ||
      (
        finalPaymentStatus === 'PAID'
          ? 'PAID'
          : 'PAYMENT_PENDING'
      );


    // ==========================================
    // 8. CREATE MONGODB ORDER
    // ==========================================
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

      paymentStatus:
        finalPaymentStatus,

      providerOrderId: null,

      orderStatus:
        finalOrderStatus
    });


    // ==========================================
    // 9. SAVE ORDER TO MONGODB
    // ==========================================
    console.log(
      `⏱️ [ORDER] MongoDB save started: ${
        Date.now() - requestStartTime
      } ms`
    );

    await newOrder.save();

    const afterMongoDBTime = Date.now();

    console.log(
      `⏱️ [ORDER] MongoDB save completed: ${
        afterMongoDBTime - requestStartTime
      } ms`
    );

    console.log(
      `⏱️ [ORDER] MongoDB save duration: ${
        afterMongoDBTime - requestStartTime
      } ms`
    );

    console.log(
      `✅ [ORDER] Order saved to MongoDB: ${internalOrderId}`
    );


    // ==========================================
    // 10. SELECT TELEGRAM CREDENTIALS
    // ==========================================
    let botToken = null;
    let targetChatId = null;

    if (platform === 'platform1') {

      botToken =
        process.env.TELEGRAM_BOT_TOKEN_1;

      targetChatId =
        process.env.TELEGRAM_CHAT_ID_1;

      console.log(
        '📌 [TELEGRAM] Platform 1 credentials selected'
      );

    } else if (platform === 'platform2') {

      botToken =
        process.env.TELEGRAM_BOT_TOKEN_2;

      targetChatId =
        process.env.TELEGRAM_CHAT_ID_2;

      console.log(
        '📌 [TELEGRAM] Platform 2 credentials selected'
      );
    }


    // ==========================================
    // 11. CHECK TELEGRAM CREDENTIALS
    // ==========================================
    console.log(
      `🔐 [TELEGRAM] Token available: ${
        botToken ? 'YES' : 'NO'
      }`
    );

    console.log(
      `🔐 [TELEGRAM] Chat ID available: ${
        targetChatId ? 'YES' : 'NO'
      }`
    );


    // ==========================================
    // 12. PREPARE TELEGRAM MESSAGE
    // ==========================================
    const telegramMessage =
      `🚀 NEW ORDER RECEIVED 🚀\n\n` +

      `🆔 Order ID: ${internalOrderId}\n` +

      `📌 Platform: ${platform}\n` +

      `🛠️ Service: ${serviceName}\n` +

      `📦 Package: ${
        packageName || 'N/A'
      }\n` +

      `🔢 Quantity: ${
        numericQuantity.toLocaleString()
      }\n` +

      `💰 Amount: ₹${
        numericAmount.toFixed(2)
      }\n` +

      `🔗 Link: ${link}\n` +

      `💳 Payment Method: ${
        paymentMethod || 'N/A'
      }\n` +

      `🧾 Transaction ID / UTR: ${
        paymentId || 'N/A'
      }\n` +

      `💵 Payment Status: ${
        finalPaymentStatus
      }\n` +

      `📋 Order Status: ${
        finalOrderStatus
      }`;


    // ==========================================
    // 13. SEND TELEGRAM
    // IMPORTANT:
    // THIS IS NOW AWAITED
    // ==========================================
    let telegramResult = {
      success: false,
      reason: 'NOT_ATTEMPTED'
    };

    if (botToken && targetChatId) {

      console.log(
        `⏱️ [ORDER] Telegram sending started: ${
          Date.now() - requestStartTime
        } ms`
      );

      telegramResult =
        await sendTelegramNotification({
          botToken,
          chatId: targetChatId,
          message: telegramMessage,
          internalOrderId,
          platform
        });

      console.log(
        `⏱️ [ORDER] Telegram process completed: ${
          Date.now() - requestStartTime
        } ms`
      );

    } else {

      console.error(
        `❌ [TELEGRAM] Credentials missing for ${platform}`
      );

      telegramResult = {
        success: false,
        reason: 'MISSING_CREDENTIALS'
      };
    }


    // ==========================================
    // 14. FINAL TIMING
    // ==========================================
    const responseTime =
      Date.now() - requestStartTime;

    console.log(
      `🚀 [ORDER] RESPONSE READY IN: ${responseTime} ms`
    );


    // ==========================================
    // 15. RETURN RESPONSE
    // ==========================================
    return res.status(201).json({

      success: true,

      message:
        telegramResult.success
          ? 'Order created successfully and Telegram notification sent.'
          : 'Order created successfully, but Telegram notification could not be sent.',

      order: newOrder,

      telegramSent:
        telegramResult.success,

      telegramStatus:
        telegramResult.success
          ? 'SENT'
          : 'FAILED',

      telegramError:
        telegramResult.success
          ? null
          : telegramResult.reason,

      responseTime
    });


  } catch (error) {

    console.error(
      '❌ [ORDER] Order Creation Error:',
      error
    );

    return res.status(500).json({

      success: false,

      message:
        'Server error while creating order.'
    });
  }
};


// ==========================================
// GET USER ORDERS
// GET /api/orders/user/:userId
// ==========================================
exports.getUserOrders = async (req, res) => {

  try {

    const { userId } =
      req.params;

    const { platform } =
      req.query;


    const query = {
      userId
    };


    if (platform) {
      query.platform =
        platform;
    }


    const orders =
      await Order
        .find(query)
        .sort({
          createdAt: -1
        });


    return res.status(200).json({

      success: true,

      orders
    });


  } catch (error) {

    console.error(
      '❌ [ORDERS] Fetch Orders Error:',
      error
    );


    return res.status(500).json({

      success: false,

      message:
        'Server error while fetching orders.'
    });
  }
};