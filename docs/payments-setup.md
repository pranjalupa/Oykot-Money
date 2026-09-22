# Turning payments on

The code is written and works in test mode. Everything left needs *your*
account, because signing up, passing KYC and holding API keys are yours to do.

**Never paste a secret into a chat, a commit, or a file that isn't `.env.local`.**
If one leaks, rotate it in the provider's dashboard — deleting the message
doesn't help.

---

## 1. Razorpay — customers paying in rupees

1. **Sign up** at <https://dashboard.razorpay.com/signup> and complete KYC.
   As an individual, pick *Individual / Proprietorship*: PAN, a bank account
   in the same name, and an address proof. Approval is usually a day or two;
   test mode works immediately, so you can finish the rest before it lands.
2. **Create two plans** — Dashboard → Subscriptions → Plans:
   - Monthly: ₹249, billing cycle *monthly*.
   - Yearly: ₹1,999, billing cycle *yearly*.
   Copy each `plan_…` id.
3. **API keys** — Settings → API Keys → *Generate Test Key*. You get a key id
   and a secret; the secret is shown once.
4. **Webhook** — Settings → Webhooks → Add:
   - URL: `https://oykot-money.vercel.app/api/webhooks/razorpay`
   - Secret: invent a long random string (this is *yours*, not Razorpay's).
   - Events: `subscription.activated`, `subscription.charged`,
     `subscription.pending`, `subscription.halted`, `subscription.cancelled`,
     `subscription.completed`.

## 2. Polar — everyone else, in dollars

Polar is a **merchant of record**: it sells to the customer, handles VAT/GST
in their country, and pays you out. That's what keeps you out of tax
registration in dozens of countries as an Indian individual.

1. **Sign up** at <https://polar.sh> and create an organisation. Approval is
   usually same-day. Payouts reach an Indian bank through Stripe Connect.
2. **Switch to the sandbox** (<https://sandbox.polar.sh>) for testing — it's a
   separate account with its own products and tokens.
3. **Create two products**, both *recurring*: $4/month and $36/year. Copy the
   product ids.
4. **Access token** — Settings → Developers → New token, scoped to
   checkouts, customers, subscriptions and webhooks.
5. **Webhook** — Settings → Webhooks → Add endpoint:
   - URL: `https://oykot-money.vercel.app/api/webhooks/polar`
   - Format: **Raw**
   - Events: `subscription.active`, `subscription.updated`,
     `subscription.canceled`, `subscription.uncanceled`, `subscription.revoked`
   - Copy the signing secret it gives you.

## 3. Environment variables

Local: put them in `.env.local`. Production: Vercel → Project → Settings →
Environment Variables (or `vercel env add`). Same names in both.

```
RAZORPAY_KEY_ID=rzp_test_…
RAZORPAY_KEY_SECRET=…
RAZORPAY_WEBHOOK_SECRET=…          # the string you invented in step 1.4
RAZORPAY_PLAN_MONTHLY=plan_…
RAZORPAY_PLAN_YEARLY=plan_…

POLAR_ACCESS_TOKEN=polar_oat_…
POLAR_WEBHOOK_SECRET=…
POLAR_PRODUCT_MONTHLY=…
POLAR_PRODUCT_YEARLY=…
POLAR_SERVER=sandbox                # "production" only when going live

NEXT_PUBLIC_SITE_URL=https://oykot-money.vercel.app
```

`ACCESS_ENFORCED` stays **off** until all of this works. Turning it on before
checkout works locks people out with no way to pay — the worst thing this app
could do.

## 4. Testing

- **Razorpay**: test card `4111 1111 1111 1111`, any future expiry, CVV `123`,
  OTP `1234`. Or UPI id `success@razorpay`.
- **Polar sandbox**: Stripe's test card `4242 4242 4242 4242`.
- **Webhooks against localhost**: both providers need a public URL. Use
  `vercel dev` against a preview deployment, or a tunnel, and point the
  webhook there while testing.
- After a test payment, check the `subscriptions` row: `status` should be
  `active`, `provider` `razorpay` or `mor`, and `current_period_end` set.

## 5. Going live

In order, not before:

1. Razorpay KYC approved, live keys swapped in, webhook pointed at the live URL.
2. Polar organisation approved, `POLAR_SERVER=production`, production token
   and webhook secret swapped in.
3. A real payment made by you, in each currency, and refunded.
4. Only then `ACCESS_ENFORCED=true`.

## What the code does with all this

- `lib/payments/razorpay.ts` — creates subscriptions, verifies the HMAC.
- `app/api/webhooks/razorpay/route.ts` — the only thing that grants rupee access.
- `app/api/checkout` + `app/api/portal` — Polar's hosted checkout and billing portal.
- `app/api/webhooks/polar/route.ts` — the same job for dollars.
- `lib/payments/store.ts` — the single writer into `subscriptions`; both
  providers translate into its shape and nothing else touches the table.
- `lib/access.ts` — reads that row and answers "what can this user do?". It
  never learns which provider paid.
