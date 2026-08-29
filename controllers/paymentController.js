const Razorpay = require('razorpay');
const crypto = require('crypto');
const { sendOrderToTelegram } = require('./telegramController');

// Razorpay Instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret'
});

// ১. Razorpay Order Create করা
exports.createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID // ফ্রন্টএন্ডের জন্য শুধুমাত্র Public Key ID
    });
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
};

// ২. Payment Verification & Telegram Order Dispatch (অত্যন্ত সুরক্ষিত)
exports.verifyPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      orderDetails // (platform, serviceName, link, quantity, userContact ইত্যাদি)
    } = req.body;

    // HMAC SHA256 Signature Verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      console.warn('Payment Signature Mismatch! Tampering attempt detected.');
      return res.status(400).json({ 
        success: false, 
        message: 'Payment verification failed! Invalid signature.' 
      });
    }

    // পেমেন্ট শতভাগ ভ্যালিড! এখন প্ল্যাটফর্ম অনুযায়ী টেলিগ্রামে মেসেজ পাঠানো হবে।
    const telegramData = {
      orderId: razorpay_order_id,
      platform: orderDetails?.platform || 'platform_1',
      serviceName: orderDetails?.serviceName || 'SMM Service',
      link: orderDetails?.link || 'N/A',
      quantity: orderDetails?.quantity || 1,
      amount: (orderDetails?.amount || 0),
      paymentId: razorpay_payment_id,
      userContact: orderDetails?.userContact || 'N/A'
    };

    // Telegram Bot-এ অর্ডার পাঠানো
    const telegramSent = await sendOrderToTelegram(telegramData);

    res.status(200).json({
      success: true,
      message: 'Payment verified and order placed successfully!',
      paymentId: razorpay_payment_id,
      telegramNotification: telegramSent
    });

  } catch (error) {
    console.error('Payment Verification Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during verification' });
  }
};