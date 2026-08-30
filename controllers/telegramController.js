// ==========================================
// TELEGRAM CONTROLLER
// Platform 1 + Platform 2
// Backend-only Telegram notification
// ==========================================

async function sendTelegramMessage(botToken, chatId, text) {
  if (!botToken || !chatId) {
    throw new Error('Telegram Bot Token or Chat ID is missing.');
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    console.error('Telegram API Error:', data);
    throw new Error(data.description || 'Telegram message failed.');
  }

  return data;
}


// ==========================================
// SEND ORDER TO TELEGRAM
// Platform 1 -> Bot 1
// Platform 2 -> Bot 2
// ==========================================

exports.sendOrderToTelegram = async (orderData) => {
  const {
    orderId,
    platform,
    serviceName,
    packageName,
    link,
    quantity,
    amount,
    paymentMethod,
    paymentId,
    userContact
  } = orderData || {};

  let botToken;
  let chatId;

  // ------------------------------------------
  // Platform selection
  // ------------------------------------------

  if (
    platform === 'platform2' ||
    platform === 'Platform 2' ||
    platform === 'platform_2'
  ) {
    botToken = process.env.TELEGRAM_BOT_TOKEN_2;
    chatId = process.env.TELEGRAM_CHAT_ID_2;
  } else {
    botToken = process.env.TELEGRAM_BOT_TOKEN_1;
    chatId = process.env.TELEGRAM_CHAT_ID_1;
  }

  if (!botToken || !chatId) {
    throw new Error(
      `Telegram configuration missing for ${platform || 'platform1'}`
    );
  }

  // ------------------------------------------
  // Clean values
  // ------------------------------------------

  const finalOrderId = orderId || 'N/A';
  const finalPlatform = platform || 'N/A';
  const finalService = serviceName || 'N/A';
  const finalPackage = packageName || 'N/A';
  const finalLink = link || 'N/A';
  const finalQuantity = quantity || 0;
  const finalAmount = amount || 0;
  const finalPaymentMethod = paymentMethod || 'N/A';
  const finalPaymentId = paymentId || 'N/A';

  // ------------------------------------------
  // Telegram message
  // ------------------------------------------

  const message =
    `🚀 NEW ORDER SUBMITTED 🚀\n\n` +
    `🆔 Order ID: #${finalOrderId}\n` +
    `📌 Social Media: ${finalPlatform}\n` +
    `🛠️ Service Name: ${finalService}\n` +
    `📦 Package: ${finalPackage}\n` +
    `🔢 Total Quantity: ${Number(finalQuantity).toLocaleString()}\n` +
    `💰 Total Price: ₹${Number(finalAmount).toFixed(2)}\n` +
    `🔗 Target Link: ${finalLink}\n` +
    `💳 Payment Method: ${finalPaymentMethod}\n` +
    `🧾 Transaction ID / UTR: ${finalPaymentId}\n` +
    `📅 Date: ${new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata'
    })}`;

  console.log(
    `Sending Telegram order notification for ${finalPlatform}`
  );

  const result = await sendTelegramMessage(
    botToken,
    chatId,
    message
  );

  console.log(
    `Telegram order notification sent successfully for ${finalPlatform}`
  );

  return {
    success: true,
    telegramMessageId: result.result?.message_id || null
  };
};


// ==========================================
// TELEGRAM WEBHOOK
// ==========================================

exports.handleWebhook = async (req, res) => {
  try {
    const message = req.body?.message;

    if (message && message.text) {
      const chatId = message.chat.id;
      const userText = message.text;

      console.log(
        `Received Telegram message from ${chatId}: ${userText}`
      );
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Telegram Webhook Error:', error);
    res.status(500).send('Error');
  }
};