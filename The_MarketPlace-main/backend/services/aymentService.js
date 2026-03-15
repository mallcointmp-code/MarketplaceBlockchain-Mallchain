// backend/services/paymentService.js
const Stripe = require("stripe");
const paypal = require("@paypal/checkout-server-sdk");
const fetch = require("node-fetch"); // for M-Pesa & Airtel HTTP APIs

// Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET);

// PayPal
const paypalClient = new paypal.core.PayPalHttpClient(
  new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_SECRET
  )
);

// Example centralized payment service
const PaymentService = {
  async processStripePayment(amount, currency, token) {
    return await stripe.paymentIntents.create({ amount, currency, payment_method: token, confirm: true });
  },

  async processPayPalPayment(orderId) {
    const request = new paypal.orders.OrdersGetRequest(orderId);
    return await paypalClient.execute(request);
  },

  async processMpesaPayment(phone, amount) {
    // Example POST call to Safaricom Daraja API
    const response = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MPESA_TOKEN}` },
      body: JSON.stringify({
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Amount: amount,
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK,
        AccountReference: "TheMarketPlace",
        TransactionDesc: "Wallet Deposit",
      }),
    });
    return response.json();
  },
};

module.exports = {
  PaymentService,
};
