import Stripe from 'stripe';

const apiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key';

export const stripe = new Stripe(apiKey, {
  apiVersion: '2026-04-22.dahlia' as any,
  typescript: true,
});
