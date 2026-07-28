# U-Puttz Amusement Centre — Booking Demo

A branded simulator-bay booking prototype with **embedded Stripe Checkout** (test mode)
and a full **manager portal** — no external database needed. All data lives in a local
JSON store (`data/db.json`) that seeds itself with demo data on first run.

## Run it

You need [Node.js](https://nodejs.org) installed.

```bash
npm install
npm start
```

Then open **http://localhost:4242**.

- **Client view** (booking site): `/`
- **Manager view** (portal): `/admin` — already signed in; use the floating
  **Client / Manager** switch in the bottom-right corner of every page to jump between them.

Without Stripe keys the checkout runs in **simulated** mode. To take real test payments,
copy `.env.example` to `.env` and add your Stripe **TEST** keys, then restart.
Pay with Stripe's test card: **4242 4242 4242 4242**, any future expiry, any CVC, any postal code.

## Demo data

The store seeds itself with U-Puttz bays, hours, rates, statuses, sample customers and
bookings. **Delete `data/db.json` and restart to reset the demo.**

## How payment works (so it's secure)

- The browser never sets the price. The **server recomputes** the amount from the bay,
  date, and time using the saved rate rules, then creates the Stripe PaymentIntent.
- Card details go straight to Stripe (embedded on the page) — they never touch this server.
- Live Stripe keys are refused by design; this prototype runs in Stripe **test mode** only.
- To test the webhook locally:
  ```bash
  stripe listen --forward-to localhost:4242/api/webhook
  ```
  Put the printed `whsec_…` value in `.env` as `STRIPE_WEBHOOK_SECRET`.

## What's real vs. placeholder

- **Real:** the full booking flow (cart holds, conflicts, pricing), the manager portal
  (tee sheet, customers, memberships, hours cards, points, statuses, overrides), and the
  Stripe payment flow in test mode.
- **Placeholder:** the seeded bookings/customers, and the manager login (any email and
  password signs in). Data persists to `data/db.json` on this machine only.

Built by Voltris AI.
