const Order = require('../models/Order');
const { waitUntil } = require('@vercel/functions');

// ============================================================
// TELEGRAM CONFIGURATION
// Platform 1 → Telegram Bot 1
// Platform 2 → Telegram Bot 2
// ============================================================

function getTelegramCredentials(platform) {
  if (platform === 'platform1') {
    return {
      botToken: process.env.TELEGRAM_BOT_TOKEN_1,
      chatId: process.env.TELEGRAM_CHAT_ID_1
    };
  }

  if (platform === 'platform2') {
    return {
      botToken: process.env.TELEGRAM_BOT_TOKEN_2,
      chatId: process.env.TELEGRAM_CHAT_ID_2
    };
  }

  return {
    botToken: null,
    chatId: null
  };
}


// ============================================================
// TELEGRAM MESSAGE SENDER
// Runs in background through Vercel waitUntil()
// ============================================================

async function sendTelegramNotification({
  platform,
  internalOrderId,
  serviceName,
  packageName,
  quantity,
  amount,
  link,
  paymentMethod,
  paymentId,
  paymentStatus,
  orderStatus
}) {
  const telegramStartTime = Date.now();

  try {
    const {
      botToken,
      chatId
    } = getTelegramCredentials(platform);

    if (!botToken || !chatId) {
      console.error(
        `❌ [TELEGRAM] Missing credentials for ${platform}`
      );

      return {
        success: false,
        reason: 'MISSING_CREDENTIALS'
      };
    }

    const telegramMessage =
      `🚀 NEW ORDER RECEIVED 🚀\n\n` +
      `🆔 Order ID: ${internalOrderId}\n` +
      `📌 Platform: ${platform}\n` +
      `🛠️ Service: ${serviceName}\n` +
      `📦 Package: ${packageName || 'N/A'}\n` +
      `🔢 Quantity: ${Number(quantity).toLocaleString()}\n` +
      `💰 Amount: ₹${Number(amount).toFixed(2)}\n` +
      `🔗 Link: ${link}\n` +
      `💳 Payment Method: ${paymentMethod || 'N/A'}\n` +
      `🧾 Transaction ID / UTR: ${paymentId || 'N/A'}\n` +
      `💵 Payment Status: ${paymentStatus}\n` +
      `📋 Order Status: ${orderStatus}`;

    console.log(
      `📤 [TELEGRAM] Sending notification: ${internalOrderId}`
    );

    // --------------------------------------------------------
    // Timeout protection
    // Telegram request will not hang forever.
    // --------------------------------------------------------

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 8000);

    let telegramResponse;

    try {
      telegramResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: telegramMessage
          }),
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const telegramData = await telegramResponse.json();

    const telegramTime =
      Date.now() - telegramStartTime;

    if (
      telegramResponse.ok &&
      telegramData &&
      telegramData.ok === true
    ) {
      console.log(
        `✅ [TELEGRAM] Notification sent successfully: ${internalOrderId} (${telegramTime} ms)`
      );

      return {
        success: true,
        telegramResponse: telegramData
      };
    }

    console.error(
      `❌ [TELEGRAM] API rejected notification: ${internalOrderId}`,
      telegramData
    );

    return {
      success: false,
      reason: 'TELEGRAM_API_ERROR',
      telegramResponse: telegramData
    };

  } catch (error) {
    const telegramTime =
      Date.now() - telegramStartTime;

    if (error.name === 'AbortError') {
      console.error(
        `❌ [TELEGRAM] Request timeout after ${telegramTime} ms: ${internalOrderId}`
      );
    } else {
      console.error(
        `❌ [TELEGRAM] Connection error after ${telegramTime} ms: ${internalOrderId}`,
        error.message
      );
    }

    return {
      success: false,
      reason:
        error.name === 'AbortError'
          ? 'TIMEOUT'
          : 'CONNECTION_ERROR',
      error: error.message
    };
  }
}


// ============================================================
// CREATE ORDER
// POST /api/orders/create
//
// Frontend
//    ↓
// Backend
//    ↓
// MongoDB
//    ↓
// Immediate response
//    ↓
// Telegram background notification via waitUntil()
// ============================================================

exports.createOrder = async (req, res) => {
  const requestStartTime = Date.now();

  try {
    // --------------------------------------------------------
    // Read request data
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Basic validation
    // --------------------------------------------------------

    if (
      !userId ||
      !platform ||
      !serviceId ||
      !serviceName ||
      !link ||
      !quantity
    ) {
      console.warn(
        '⚠️ [ORDER] Required fields missing'
      );

      return res.status(400).json({
        success: false,
        message: 'Required order fields are missing.'
      });
    }


    // --------------------------------------------------------
    // Validate platform
    // --------------------------------------------------------

    if (
      platform !== 'platform1' &&
      platform !== 'platform2'
    ) {
      console.warn(
        `⚠️ [ORDER] Invalid platform: ${platform}`
      );

      return res.status(400).json({
        success: false,
        message: 'Invalid platform.'
      });
    }


    // --------------------------------------------------------
    // Convert amount
    // --------------------------------------------------------

    const numericAmount = Number(amount || 0);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order amount.'
      });
    }


    // --------------------------------------------------------
    // Convert quantity
    // --------------------------------------------------------

    const numericQuantity = Number(quantity);

    if (
      !Number.isFinite(numericQuantity) ||
      numericQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order quantity.'
      });
    }


    // --------------------------------------------------------
    // Generate internal order ID
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Payment status
    // --------------------------------------------------------

    const finalPaymentStatus =
      paymentStatus ||
      (paymentId
        ? 'PAID'
        : 'PAYMENT_PENDING');


    // --------------------------------------------------------
    // Order status
    // --------------------------------------------------------

    const finalOrderStatus =
      orderStatus ||
      (
        finalPaymentStatus === 'PAID'
          ? 'PAID'
          : 'PAYMENT_PENDING'
      );


    // --------------------------------------------------------
    // Create MongoDB document
    // --------------------------------------------------------

    const newOrder = new Order({
      internalOrderId,

      userId,

      platform,

      serviceId:
        String(serviceId),

      serviceName,

      link,

      quantity:
        numericQuantity,

      amount:
        numericAmount,

      paymentId:
        paymentId || null,

      paymentStatus:
        finalPaymentStatus,

      providerOrderId:
        null,

      orderStatus:
        finalOrderStatus
    });


    // --------------------------------------------------------
    // Save order to MongoDB
    // --------------------------------------------------------

    console.log(
      `⏱️ [ORDER] MongoDB save started: ${
        Date.now() - requestStartTime
      } ms`
    );

    await newOrder.save();

    console.log(
      `⏱️ [ORDER] MongoDB save completed: ${
        Date.now() - requestStartTime
      } ms`
    );

    console.log(
      `✅ [ORDER] Order saved to MongoDB: ${internalOrderId}`
    );


    // ========================================================
    // TELEGRAM BACKGROUND TASK
    //
    // IMPORTANT:
    // waitUntil() keeps the background task alive on Vercel
    // without making the customer wait for Telegram.
    // ========================================================

    const {
      botToken,
      chatId
    } = getTelegramCredentials(platform);


    if (botToken && chatId) {

      console.log(
        `📤 [TELEGRAM] Queuing background notification: ${internalOrderId}`
      );

      waitUntil(
        sendTelegramNotification({
          platform,
          internalOrderId,
          serviceName,
          packageName,
          quantity: numericQuantity,
          amount: numericAmount,
          link,
          paymentMethod,
          paymentId,
          paymentStatus:
            finalPaymentStatus,
          orderStatus:
            finalOrderStatus
        })
      );

      console.log(
        `⚡ [TELEGRAM] Background task queued: ${internalOrderId}`
      );

    } else {

      console.warn(
        `⚠️ [TELEGRAM] Credentials missing for ${platform}`
      );

    }


    // --------------------------------------------------------
    // Prepare response time
    // --------------------------------------------------------

    const responseTime =
      Date.now() - requestStartTime;

    console.log(
      `🚀 [ORDER] RESPONSE READY IN: ${responseTime} ms`
    );


    // --------------------------------------------------------
    // Send response immediately
    // --------------------------------------------------------

    return res.status(201).json({
      success: true,

      message:
        'Order created successfully.',

      order:
        newOrder,

      telegramStatus:
        botToken && chatId
          ? 'QUEUED'
          : 'NOT_CONFIGURED',

      responseTimeMs:
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


// ============================================================
// GET USER ORDERS
// GET /api/orders/user/:userId
// ============================================================

exports.getUserOrders = async (req, res) => {

  try {

    const {
      userId
    } = req.params;

    const {
      platform
    } = req.query;


    // --------------------------------------------------------
    // Build query
    // --------------------------------------------------------

    const query = {
      userId
    };


    if (platform) {
      query.platform = platform;
    }


    // --------------------------------------------------------
    // Get orders
    // --------------------------------------------------------

    const orders = await Order
      .find(query)
      .sort({
        createdAt: -1
      });


    // --------------------------------------------------------
    // Return orders
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      orders
    });


  } catch (error) {

    console.error(
      '❌ [ORDER] Fetch Orders Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Server error while fetching orders.'
    });

  }

};