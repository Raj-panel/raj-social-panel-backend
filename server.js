require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

/* =========================================================
   MONGODB CONNECTION
   Optimized for Local Development + Vercel / Serverless
   ========================================================= */

const mongooseCache =
  global.mongooseCache || {
    conn: null,
    promise: null
  };

global.mongooseCache = mongooseCache;

const connectMongoDB = async () => {
  const startTime = Date.now();

  // Already connected
  if (
    mongooseCache.conn &&
    mongoose.connection.readyState === 1
  ) {
    console.log(
      `⏱️ MongoDB already connected: ${Date.now() - startTime} ms`
    );

    return mongooseCache.conn;
  }

  // If connection is already in progress,
  // wait for the existing connection.
  if (mongooseCache.promise) {
    return mongooseCache.promise;
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing');
  }

  mongooseCache.promise = mongoose
    .connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      bufferCommands: false,
      maxPoolSize: 10
    })
    .then((mongooseInstance) => {
      mongooseCache.conn = mongooseInstance;

      console.log(
        `⏱️ MongoDB connection time: ${Date.now() - startTime} ms`
      );

      console.log(
        `✅ MongoDB Connected Successfully: ${mongooseInstance.connection.host}`
      );

      return mongooseInstance;
    })
    .catch((error) => {
      mongooseCache.promise = null;
      mongooseCache.conn = null;

      console.error(
        '❌ MongoDB Connection Error:',
        error.message
      );

      throw error;
    });

  return mongooseCache.promise;
};


/* =========================================================
   MIDDLEWARE
   ========================================================= */

app.use(cors({
  origin: [
    'https://rajsmmpanel.in',
    'https://www.rajsmmpanel.in',
    'http://localhost:3000',
    'http://localhost:5000'
  ],
  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With'
  ],
  credentials: true
}));

app.options('*', cors());

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
   MONGODB CONNECTION MIDDLEWARE
   Every database-dependent API request waits
   until MongoDB is connected.
   ========================================================= */

app.use(async (req, res, next) => {
  try {
    await connectMongoDB();
    next();
  } catch (error) {
    console.error(
      '❌ Database unavailable:',
      error.message
    );

    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable.'
    });
  }
});


/* =========================================================
   ORDER ROUTES
   ========================================================= */

app.use('/api/orders', orderRoutes);


/* =========================================================
   PAYMENT ROUTES
   ========================================================= */

app.use('/api/payment', paymentRoutes);


/* =========================================================
   TELEGRAM ORDER SUBMISSION
   POST /api/send-order
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


    /* -------------------------------------------------------
       VALIDATION
    ------------------------------------------------------- */

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


    /* -------------------------------------------------------
       PLATFORM
    ------------------------------------------------------- */

    const selectedPlatform =
      platform || source || 'platform1';

    let botToken = null;
    let targetChatId = null;

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


    /* -------------------------------------------------------
       TELEGRAM CREDENTIAL CHECK
    ------------------------------------------------------- */

    if (!botToken || !targetChatId) {
      return res.status(500).json({
        success: false,
        message:
          `Telegram credentials are missing for ${selectedPlatform}.`
      });
    }


    /* -------------------------------------------------------
       ORDER DATA
    ------------------------------------------------------- */

    const finalOrderId =
      orderId ||
      Math.floor(
        100000 + Math.random() * 900000
      );

    const finalAmount =
      amount !== undefined &&
      amount !== null &&
      amount !== ''
        ? amount
        : (price || '0.00');

    const finalTxnId =
      txnId ||
      transactionId ||
      'N/A';

    const finalUserIdentifier =
      userIdentifier ||
      userId ||
      'N/A';

    const finalPaymentMethod =
      paymentMethod ||
      'UPI QR Code';


    /* -------------------------------------------------------
       DATE
    ------------------------------------------------------- */

    const now = new Date();

    const formattedDate =
      now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });


    /* -------------------------------------------------------
       TELEGRAM MESSAGE
    ------------------------------------------------------- */

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
      `👤 User: ${finalUserIdentifier}\n\n` +
      `📅 Date: ${formattedDate}`;


    /* -------------------------------------------------------
       SEND TO TELEGRAM
    ------------------------------------------------------- */

    const telegramApiUrl =
      `https://api.telegram.org/bot${botToken}/sendMessage`;

    const telegramResponse =
      await fetch(
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


    /* -------------------------------------------------------
       TELEGRAM ERROR
    ------------------------------------------------------- */

    if (!telegramData.ok) {
      console.error(
        '❌ Telegram API Error:',
        telegramData
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to send order to Telegram',
        error:
          telegramData.description ||
          'Telegram API error'
      });
    }


    /* -------------------------------------------------------
       SUCCESS
    ------------------------------------------------------- */

    console.log(
      `✅ Telegram notification sent: ${finalOrderId}`
    );

    return res.status(200).json({
      success: true,
      message:
        'Order sent successfully!',
      orderId: finalOrderId
    });

  } catch (error) {

    console.error(
      '❌ Telegram Order Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Backend server error',
      error:
        error.message
    });
  }
});


/* =========================================================
   404 HANDLER
   ========================================================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message:
      `Route not found: ${req.method} ${req.originalUrl}`
  });
});


/* =========================================================
   GLOBAL ERROR HANDLER
   ========================================================= */

app.use((err, req, res, next) => {

  console.error(
    '❌ Unhandled Server Error:',
    err
  );

  res.status(500).json({
    success: false,
    message:
      'Internal server error'
  });
});


/* =========================================================
   START SERVER
   Local Development:
   MongoDB connects automatically BEFORE server starts.

   Vercel:
   The app is exported normally and MongoDB connection
   remains handled by the request middleware above.
   ========================================================= */

const PORT =
  process.env.PORT || 5000;

if (require.main === module) {
  connectMongoDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(
          `🚀 Backend is running on port ${PORT}`
        );
      });
    })
    .catch((error) => {
      console.error(
        '❌ Backend startup failed because MongoDB could not connect:',
        error.message
      );

      process.exit(1);
    });
}


/* =========================================================
   EXPORT FOR VERCEL
   ========================================================= */

module.exports = app;