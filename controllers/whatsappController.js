exports.generateWhatsAppLink = (req, res) => {
  const { orderId, serviceName, amount } = req.body;
  
  const phoneNumber = "+919239628344"; // আপনার WhatsApp নম্বর (কান্ট্রি কোড সহ)

  // মেসেজ ফরম্যাট
  const text = `Hello, I placed an order.\nOrder ID: ${orderId}\nService: ${serviceName}\nAmount: ${amount}`;
  
  // URL Encode করা যাতে স্পেস বা নিউলাইন ঠিকভাবে যায়
  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedText}`;

  res.status(200).json({
    success: true,
    url: whatsappUrl
  });
};