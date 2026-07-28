import { stripeStatus } from '../lib/booking.js';

// Tells the browser whether Stripe is live (+ publishable key). The demo's data store
// is built in, so dbEnabled is always true.
export default function handler(req, res) {
  const { enabled, publishableKey } = stripeStatus(process.env);
  res.status(200).json({
    stripeEnabled: enabled,
    publishableKey: enabled ? publishableKey : null,
    dbEnabled: true,
  });
}
