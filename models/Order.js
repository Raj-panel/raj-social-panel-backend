const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    internalOrderId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    platform: { type: String, enum: ['platform1', 'platform2'], required: true },
    serviceId: { type: String, required: true },
    serviceName: { type: String, required: true },
    link: { type: String, required: true },
    quantity: { type: Number, required: true },
    amount: { type: Number, required: true },
    paymentId: { type: String, default: null },
    paymentStatus: {
      type: String,
      enum: ['PAYMENT_PENDING', 'PAID', 'FAILED'],
      default: 'PAYMENT_PENDING'
    },
    providerOrderId: { type: String, default: null },
    orderStatus: {
      type: String,
      enum: ['PAYMENT_PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'CANCELED', 'FAILED'],
      default: 'PAYMENT_PENDING'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);