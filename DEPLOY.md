# mindGigs — Stripe + Firebase Deployment Guide

## Prerequisites
- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project (mindgigs-62f27 or your project)
- A Stripe account (stripe.com)

---

## Step 1 — Install Firebase CLI and login

```bash
npm install -g firebase-tools
firebase login
firebase use mindgigs-62f27   # or your project ID
```

---

## Step 2 — Set Stripe environment variables on Firebase

Get these from your Stripe Dashboard:
- Secret key: Dashboard → Developers → API Keys → Secret key
- Webhook secret: set in Step 4 after deploying

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
# paste your sk_live_... key when prompted

firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# paste the webhook signing secret (from Step 4)

firebase functions:secrets:set CLIENT_URL
# paste: https://mindgigs.com
```

---

## Step 3 — Deploy Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

After deploy, Firebase gives you two URLs like:
```
createCheckoutSession: https://us-central1-mindgigs-62f27.cloudfunctions.net/createCheckoutSession
stripeWebhook:         https://us-central1-mindgigs-62f27.cloudfunctions.net/stripeWebhook
```

Copy the base URL: `https://us-central1-mindgigs-62f27.cloudfunctions.net`

---

## Step 4 — Register webhook in Stripe Dashboard

1. Go to stripe.com/dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://us-central1-mindgigs-62f27.cloudfunctions.net/stripeWebhook`
4. Select event: `checkout.session.completed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_...`)
7. Run: `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`
8. Paste the signing secret

---

## Step 5 — Add VITE_FUNCTIONS_URL to your frontend .env

Create a `.env` file in your project root (copy from `.env.example`):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_FUNCTIONS_URL=https://us-central1-mindgigs-62f27.cloudfunctions.net
```

---

## Step 6 — Build and deploy frontend to SiteGround

```bash
npm install
npm run build
```

Upload the entire `dist/` folder to your SiteGround public_html directory via FTP or File Manager.

The `.htaccess` file in `public/` is already included — it handles SPA routing so page refreshes don't 404.

---

## Step 7 — Deploy Firestore rules

```bash
firebase deploy --only firestore:rules
```

---

## How money flows after this is live

1. Client picks a session and clicks Pay
2. Frontend calls `createCheckoutSession` Cloud Function
3. Cloud Function creates a Stripe Checkout session and returns the URL
4. Client is redirected to Stripe-hosted payment page (you never touch card data)
5. Client enters card details on Stripe's page
6. Stripe processes payment and calls your `stripeWebhook` Cloud Function
7. Webhook verifies the Stripe signature (rejects fakes)
8. Webhook confirms the booking in Firestore
9. Webhook calculates commission split (80/20 or 70/25/5)
10. Webhook writes commission doc to Firestore
11. Webhook increments expert's and affiliate's pendingPayout atomically
12. Client is redirected back to mindgigs.com?payment=success
13. Expert dashboard and affiliate dashboard update in real time

---

## Paying out experts and affiliates

When an expert or affiliate requests a payout, a doc appears in your `payoutRequests` Firestore collection. You can see these in the Admin → Transactions dashboard.

To pay them:
- Stripe Dashboard → Payments → find the original charge → issue a Transfer (to a bank account you've collected from them)
- Or use PayPal / bank transfer and mark the payoutRequest as `paid` in Firestore

A fully automated payout flow (Stripe Payouts API) can be added later.

---

## Testing before going live

Use Stripe test mode first:
- Set `STRIPE_SECRET_KEY` to your `sk_test_...` key
- Use Stripe test card: `4242 4242 4242 4242`, any future date, any CVC
- Verify the webhook fires, booking is confirmed, commission is written
- Switch to `sk_live_...` when ready
