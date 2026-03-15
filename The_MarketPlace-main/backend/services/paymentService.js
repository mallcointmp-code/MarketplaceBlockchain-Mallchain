const axios = require('axios');
require('dotenv').config();

const paymentGateways = {
  stripe: {
    name: 'Stripe',
    deposit: async ({ amount, currency, source }) => {
      let stripe;
      try {
        const Stripe = require('stripe');
        stripe = Stripe(process.env.STRIPE_SECRET_KEY);
      } catch (e) {
        // Fallback or dynamic import if needed
        const StripeMod = await import('stripe');
        const Stripe = StripeMod.default || StripeMod;
        stripe = Stripe(process.env.STRIPE_SECRET_KEY);
      }
      return await stripe.charges.create({ amount: Math.round(amount * 100), currency, source, description: 'Marketplace payment' });
    },
    withdraw: async () => { throw new Error('Stripe withdrawal integration not implemented.'); }
  },
  paypal: {
    name: 'PayPal',
    deposit: async () => { throw new Error('PayPal deposit integration not implemented.'); },
    withdraw: async () => { throw new Error('PayPal withdrawal integration not implemented.'); }
  },
  mpesa: {
    name: 'M-Pesa',
    deposit: async () => { throw new Error('M-Pesa deposit integration not implemented.'); },
    withdraw: async () => { throw new Error('M-Pesa withdrawal integration not implemented.'); }
  },
  airtel: {
    name: 'Airtel Money',
    deposit: async () => { throw new Error('Airtel Money integration not implemented.'); },
    withdraw: async () => { throw new Error('Airtel Money integration not implemented.'); }
  },
  card: {
    name: 'Card Payments',
    deposit: async () => { throw new Error('Card payment integration not implemented.'); },
    withdraw: async () => { throw new Error('Card refund integration not implemented.'); }
  }
};

async function processPayment(method, action, ...args) {
  const gateway = paymentGateways[method];
  if (!gateway) throw new Error(`Unsupported payment method: ${method}`);
  const func = gateway[action];
  if (!func) throw new Error(`Unsupported action: ${action}`);
  return await func(...args);
}

module.exports = { paymentGateways, processPayment };
