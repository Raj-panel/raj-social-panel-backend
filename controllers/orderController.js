const Order = require('../models/Order');

/**
 * Send Telegram notification
 * This function is intentionally separate from the main order response.
 */
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
  try {
    let botToken = null;
    let targetChatId = null;

    // Platform 1 Telegram
    if (platform === 'platform1') {
      botToken = process.env.TELEGRAM_BOT_TOKEN_1;
      targetChatId = process.env.TELEGRAM_CHAT_ID_1;
    }

    // Platform 2 Telegram
    if (platform === 'platform2') {
      botToken = process.env.TELEGRAM_BOT_TOKEN_2;
      targetChatId = process.env.TELEGRAM_CHAT_ID_2;
    }

    if (!botToken || !targetChatId) {
      console.warn(
        '⚠ Telegram credentials are missing for:',
        platform
      );
      return false;
    }

    const telegramMessage =
      `🚀 NEW ORDER RECEIVED 🚀\n\n` +
      `🆔 Order ID: ${internalOrderId}\n` +
      `📌 Platform: ${platform}\n` +
      `🛠 Service: ${serviceName}\n` +
      `📦 Package: ${packageName || 'N/A'}\n` +
      `🔢 Quantity: ${Number(quantity).toLocaleString()}\n` +
      `💰 Amount: ₹${Number(amount).toFixed(2)}\n` +
      `🔗 Link: ${link}\n` +
      `💳 Payment Method: ${paymentMethod || 'N/A'}\n` +
      `🧾 Transaction ID / UTR: ${paymentId || 'N/A'}\n` +
      `💵 Payment Status: ${paymentStatus}\n` +
      `📋 Order Status: ${orderStatus}`;

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

    const telegramData = await telegramResponse.json();

    if (telegramData.ok) {
      console.log(
        `✅ Telegram notification sent: ${internalOrderId}`
      );
      return true;
    }

    console.error(
      '❌ Telegram API Error:',
      telegramData
    );

    return false;
  } catch (telegramError) {
    console.error(
      '❌ Telegram connection error:',
      telegramError
    );

    return false;
  }
}


/**
 * CREATE ORDER
 */
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


    // -----------------------------
    // VALIDATION
    // -----------------------------

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


    // -----------------------------
    // PLATFORM VALIDATION
    // -----------------------------

    if (!['platform1', 'platform2'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform.'
      });
    }


    // -----------------------------
    // AMOUNT VALIDATION
    // -----------------------------

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


    // -----------------------------
    // QUANTITY VALIDATION
    // -----------------------------

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


    // -----------------------------
    // CREATE INTERNAL ORDER ID
    // -----------------------------

    const internalOrderId =
      'ORD-' +
      Date.now() +
      '-' +
      Math.floor(1000 + Math.random() * 9000);


    // -----------------------------
    // PAYMENT STATUS
    // -----------------------------

    const finalPaymentStatus =
      paymentStatus ||
      (paymentId ? 'PAID' : 'PAYMENT_PENDING');


    // -----------------------------
    // ORDER STATUS
    // -----------------------------

    const finalOrderStatus =
      orderStatus ||
      (
        finalPaymentStatus === 'PAID'
          ? 'PAID'
          : 'PAYMENT_PENDING'
      );


    // -----------------------------
    // CREATE ORDER DOCUMENT
    // -----------------------------

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


    // -----------------------------
    // SAVE TO MONGODB
    // -----------------------------

    await newOrder.save();

    console.log(
      `✅ Order saved to MongoDB: ${internalOrderId}`
    );


    // ==================================================
    // IMPORTANT:
    // SEND SUCCESS RESPONSE IMMEDIATELY AFTER DB SAVE
    // ==================================================

    res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      order: newOrder,
      telegramSent: false
    });


    // ==================================================
    // TELEGRAM NOTIFICATION
    //
    // Do NOT await this.
    // Customer does not have to wait for Telegram.
    // ==================================================

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
      paymentStatus: finalPaymentStatus,
      orderStatus: finalOrderStatus
    }).catch((error) => {
      console.error(
        '❌ Background Telegram notification failed:',
        error
      );
    });


  } catch (error) {
    console.error(
      '❌ Order Creation Error:',
      error
    );

    // Avoid sending a second response if response
    // has already been sent.
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Server error while creating order.'
      });
    }
  }
};


/**
 * GET USER ORDERS
 */
exports.getUserOrders = async (req, res) => {
  try {
    const {
      userId
    } = req.params;

    const {
      platform
    } = req.query;


    const query = {
      userId
    };


    if (platform) {
      query.platform = platform;
    }


    const orders = await Order
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
      '❌ Fetch Orders Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching orders.'
    });
  }
};