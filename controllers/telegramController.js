exports.handleWebhook = async (req, res) => {
  try {
    const message = req.body.message;

    if (message && message.text) {
      const chatId = message.chat.id;
      const userText = message.text;

      console.log(`Received message from ${chatId}: ${userText}`);

      // আপনি চাইলে এখান থেকে টেলিগ্রাম ইউজারকে অটো-মেসেজ পাঠাতে পারেন
    }

    // টেলিগ্রামকে জানাতে হবে যে মেসেজ পাওয়া গেছে (200 OK)
    res.status(200).send('OK');
  } catch (error) {
    console.error('Telegram Webhook Error:', error);
    res.status(500).send('Error');
  }
};