require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// CORS চালু করা যেন ব্রাউজার ব্লক না করে
app.use(cors());
app.use(express.json());

app.post('/api/send-order', async (req, res) => {
    try {
        const { source, serviceName, quantity, link, price } = req.body;
        
        // .env ফাইল থেকে বট টোকেন নেওয়া হচ্ছে
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        let targetChatId;

        // কোন প্ল্যাটফর্ম থেকে রিকোয়েস্ট এসেছে তা ফিল্টার করা
        if (source === 'platform1') {
            targetChatId = process.env.CHAT_ID_PLATFORM_1;
        } else if (source === 'platform2') {
            targetChatId = process.env.CHAT_ID_PLATFORM_2;
        } else {
            // যদি source কাস্টম হয় বা ম্যাচ না করে তবে ডিফল্ট চ্যাট আইডিতে পাঠানোর ফলব্যাক
            targetChatId = process.env.CHAT_ID_PLATFORM_1 || process.env.CHAT_ID_PLATFORM_2;
        }

        if (!targetChatId || !BOT_TOKEN) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid configuration: BOT_TOKEN or CHAT_ID missing in .env' 
            });
        }

        const message = `📦 New Order Received!\n` +
                        `----------------------\n` +
                        `🌐 Source: ${(source || 'N/A').toUpperCase()}\n` +
                        `🛠️ Service: ${serviceName || 'N/A'}\n` +
                        `🔢 Quantity: ${quantity || 0}\n` +
                        `🔗 Link: ${link || 'N/A'}\n` +
                        `💵 Price: ${price || '0'}`;

        // ব্যাকএন্ড থেকে সরাসরি টেলিগ্রাম API-তে রিকোয়েস্ট
        const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
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
            console.error("Telegram API Error:", data);
            return res.status(500).json({ success: false, error: data.description });
        }

    } catch (error) {
        console.error("Backend Server Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend is running on port ${PORT}`));