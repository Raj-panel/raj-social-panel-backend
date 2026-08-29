require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Order Routes ইমপোর্ট
const orderRoutes = require('./routes/orderRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. Root / Test Route (ব্রাউজারে Cannot GET / বন্ধ করার জন্য)
app.get('/', (req, res) => {
  res.send('Raj Social Panel Backend API is running successfully!');
});

// 2. MongoDB Connection
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch((err) => console.error('MongoDB Connection Error:', err));
} else {
  console.warn('Warning: MONGO_URI is missing in .env file');
}

// 3. New Standard Order Routes (/api/orders/create & /api/orders/user/:userId)
app.use('/api/orders', orderRoutes);

// 4. Legacy Telegram Direct Route (/api/send-order)
app.post('/api/send-order', async (req, res) => {
  try {
    const { source, serviceName, quantity, link, price } = req.body;

    let botToken;
    let targetChatId;

    // .env ফাইলের ভ্যারিয়েবলের সাথে মিল রেখে প্ল্যাটফর্ম ফিল্টার
    if (source === 'platform1') {
      botToken = process.env.TELEGRAM_BOT_TOKEN_1;
      targetChatId = process.env.TELEGRAM_CHAT_ID_1;
    } else if (source === 'platform2') {
      botToken = process.env.TELEGRAM_BOT_TOKEN_2;
      targetChatId = process.env.TELEGRAM_CHAT_ID_2;
    } else {
      botToken = process.env.TELEGRAM_BOT_TOKEN_1 || process.env.TELEGRAM_BOT_TOKEN_2;
      targetChatId = process.env.TELEGRAM_CHAT_ID_1 || process.env.TELEGRAM_CHAT_ID_2;
    }

    if (!targetChatId || !botToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid configuration: TELEGRAM_BOT_TOKEN or CHAT_ID missing in .env'
      });
    }

    const message =
      `📦 New Order Received!\n` +
      `----------------------\n` +
      `🌐 Source: ${(source || 'N/A').toUpperCase()}\n` +
      `🛠️ Service: ${serviceName || 'N/A'}\n` +
      `🔢 Quantity: ${quantity || 0}\n` +
      `🔗 Link: ${link || 'N/A'}\n` +
      `💵 Price: ${price || '0'}`;

    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message
      })
    });

    const data = await telegramRes.json();

    if (data.ok) {
      return res.status(200).json({ success: true, message: 'Order sent successfully!' });
    } else {
      console.error('Telegram API Error:', data);
      return res.status(500).json({ success: false, error: data.description });
    }
  } catch (error) {
    console.error('Backend Server Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend is running on port ${PORT}`));