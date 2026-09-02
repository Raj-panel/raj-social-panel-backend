require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

/* =========================================================
   ROOT / HEALTH CHECK
========================================================= */

app.get('/', (req, res) => {
  res.status(200).send(
    'Raj Social Panel Backend API is running successfully!'
  );
});

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Raj Social Panel API is running successfully!'
  });
});

/* =========================================================
   MONGODB CONNECTION
========================================================= */

if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log('MongoDB Connected Successfully');
    })
    .catch((err) => {
      console.error('MongoDB Connection Error:', err.message);
    });
} else {
  console.warn('Warning: MONGO_URI is missing in .env file');
}

/* =========================================================
   ORDER ROUTES
========================================================= */

// POST /api/orders/create
// GET  /api/orders/user/:userId

app.use('/api/orders', orderRoutes);

/* =========================================================
   PAYMENT ROUTES
========================================================= */

// POST /api/payment/create-order
// POST /api/payment/verify

app.use('/api/payment', paymentRoutes);

/* =========================================================
   TELEGRAM ORDER SUBMISSION
   FRONTEND → BACKEND → TELEGRAM

   IMPORTANT:
   এখানে কোনো SMM Provider API ব্যবহার করা হচ্ছে না।
   Customer order করলে শুধু Telegram-এ notification যাবে।
========================================================= */

app.post('/api/send-order', async (req, res) => {
  try {
    const {
      source,
      platform,
      orderId,
      serviceId,
      serviceName,
      packageName,
      quantity,
      link,
      price,
      amount,
      paymentMethod,
      txnId,
      transactionId,
      userIdentifier,
      userId
    } = req.body;

    /* -----------------------------------------------------
       BASIC VALIDATION
    ----------------------------------------------------- */

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        message: 'Service name is required'
      });
    }

    if (!link) {
      return res.status(400).json({
        success: false,
        message: 'Target link is required'
      });
    }

    if (!quantity) {
      return res.status(400).json({
        success: false,
        message: 'Quantity is required'
      });
    }

    /* -----------------------------------------------------
       PLATFORM / SOURCE
    ----------------------------------------------------- */

    const selectedPlatform =
      platform ||
      source ||
      'platform1';

    /* -----------------------------------------------------
       TELEGRAM CREDENTIAL SELECTION
    ----------------------------------------------------- */

    let botToken;
    let targetChatId;

    if (
      selectedPlatform === 'platform2' ||
      source === 'platform2'
    ) {
      botToken = process.env.TELEGRAM_BOT_TOKEN_2;
      targetChatId = process.env.TELEGRAM_CHAT_ID_2;
    } else {
      botToken = process.env.TELEGRAM_BOT_TOKEN_1;
      targetChatId = process.env.TELEGRAM_CHAT_ID_1;
    }

    /* -----------------------------------------------------
       FALLBACK TELEGRAM CREDENTIALS
    ----------------------------------------------------- */

    if (!botToken || !targetChatId) {
      botToken =
        process.env.TELEGRAM_BOT_TOKEN_1 ||
        process.env.TELEGRAM_BOT_TOKEN_2;

      targetChatId =
        process.env.TELEGRAM_CHAT_ID_1 ||
        process.env.TELEGRAM_CHAT_ID_2;
    }

    if (!botToken || !targetChatId) {
      console.error(
        'Telegram configuration missing in .env'
      );

      return res.status(500).json({
        success: false,
        message:
          'Telegram Bot Token or Chat ID is missing in .env'
      });
    }

    /* -----------------------------------------------------
       ORDER ID
    ----------------------------------------------------- */

    const finalOrderId =
      orderId ||
      Math.floor(
        100000 +
        Math.random() * 900000
      );

    /* -----------------------------------------------------
       PRICE
    ----------------------------------------------------- */

    let finalAmount = amount;

    if (
      finalAmount === undefined ||
      finalAmount === null ||
      finalAmount === ''
    ) {
      finalAmount = price || '0.00';
    }

    /* -----------------------------------------------------
       TRANSACTION ID
    ----------------------------------------------------- */

    const finalTxnId =
      txnId ||
      transactionId ||
      'N/A';

    /* -----------------------------------------------------
       USER IDENTIFIER
    ----------------------------------------------------- */

    const finalUserIdentifier =
      userIdentifier ||
      userId ||
      'N/A';

    /* -----------------------------------------------------
       PAYMENT METHOD
    ----------------------------------------------------- */

    const finalPaymentMethod =
      paymentMethod ||
      'UPI QR Code';

    /* -----------------------------------------------------
       CURRENT DATE & TIME
    ----------------------------------------------------- */

    const now = new Date();

    const formattedDate = now.toLocaleString(
      'en-IN',
      {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }
    );

    /* -----------------------------------------------------
       TELEGRAM MESSAGE
    ----------------------------------------------------- */

    const message =
      `🚀 NEW ORDER SUBMITTED 🚀\n\n` +
      `🆔 Order ID: #${finalOrderId}\n\n` +
      `📌 Social Media: ${platform || source || 'N/A'}\n\n` +
      `🛠️ Service Name: ${serviceName || 'N/A'}\n\n` +
      `📦 Package: ${packageName || 'N/A'}\n\n` +
      `🔢 Total Quantity: ${Number(quantity || 0).toLocaleString('en-IN')}\n\n` +
      `💰 Total Price: ₹${String(finalAmount).replace(/^₹/, '')}\n\n` +
      `🔗 Target Link: ${link}\n\n` +
      `💳 Payment Method: ${finalPaymentMethod}\n\n` +
      `🧾 Transaction ID / UTR: ${finalTxnId}\n\n` +
      `📅 Date: ${formattedDate}`;

    /* -----------------------------------------------------
       SEND TO TELEGRAM
    ----------------------------------------------------- */

    const telegramApiUrl =
      `https://api.telegram.org/bot${botToken}/sendMessage`;

    const telegramResponse = await fetch(
      telegramApiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: message
        })
      }
    );

    const telegramData =
      await telegramResponse.json();

    /* -----------------------------------------------------
       TELEGRAM ERROR
    ----------------------------------------------------- */

    if (!telegramData.ok) {
      console.error(
        'Telegram API Error:',
        telegramData
      );

      return res.status(500).json({
        success: false,
        message: 'Failed to send order to Telegram',
        error: telegramData.description || 'Telegram API error'
      });
    }

    /* -----------------------------------------------------
       SUCCESS
    ----------------------------------------------------- */

    console.log(
      `Telegram order sent successfully: #${finalOrderId}`
    );

    return res.status(200).json({
      success: true,
      message: 'Order sent successfully!',
      orderId: finalOrderId
    });

  } catch (error) {
    console.error(
      'Backend Send Order Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Backend server error',
      error: error.message
    });
  }
});

/* =========================================================
   404 HANDLER
========================================================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);

  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

/* =========================================================
   START SERVER
========================================================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Backend is running on port ${PORT}`
  );
});
module.exports = app;
