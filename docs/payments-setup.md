# Turning payments on

The code is written and works in test mode. Everything left needs *your*
account, because signing up, passing KYC and holding API keys are yours to do.

**Never paste a secret into a chat, a commit, or a file that isn't `.env.local`.**
If one leaks, rotate it in the provider's dashboard — deleting the message
doesn't help.

## What you're setting up

Two providers, split by currency — the app picks one and the customer never
sees a choice:

| Customer pays in | Provider | Why |
| --- | --- | --- |
| **₹ rupees** | Razorpay | Domestic rails: UPI autopay, Indian cards, no FX |
| **$ dollars** | Polar | Merchant of record — it sells, handles VAT/GST worldwide, pays you out |

**Why a merchant of record at all:** selling a digital subscription to an EU
consumer means VAT is owed from the first euro, with no threshold for a
non-EU seller. Same story in the UK and a dozen others. An MoR becomes the
seller, so those registrations are theirs, not yours. It costs about 6.5% +
50¢ per charge — 13% of the $7.99 monthly, 7% of the $59 yearly — which is
why yearly is the plan worth pushing.

## The trial, by region

Both are 7 days. They work differently because the rails do:

| | India (Razorpay) | Everywhere else (Polar) |
| --- | --- | --- |
| Starts | At signup, no card | At checkout, with a card |
| The ask | From day 6 the app asks them to set up UPI Autopay | None: the card's already there |
| First charge | When the trial ends: the subscription is created with `start_at` = trial end | When the trial ends: set on the Polar products |
| Walk away | Skip Autopay; nothing is ever charged | Cancel in Settings before day 7; nothing is charged |

The rules live in `TRIAL` in `lib/pricing.ts`. A user's region comes from
their profile; a card-region user who hasn't checked out is `pending`, which
only locks anything once `ACCESS_ENFORCED` is on. The day-6 ask is in the app
only (the trial banner and pricing page). There's no email yet.

---

## 1. Razorpay — customers paying in rupees

1. **Sign up** at <https://dashboard.razorpay.com/signup> and complete KYC.
   As an individual, pick *Individual / Proprietorship*: PAN, a bank account
   in the same name, and an address proof. Approval is usually a day or two;
   test mode works immediately, so you can finish the rest before it lands.
2. **Create two plans** — Dashboard → Subscriptions → Plans:
   - Monthly: ₹99, billing cycle *monthly*.
   - Yearly: ₹799, billing cycle *yearly*.
   No trial on the plans: the app starts the subscription at the trial's end
   itself (`start_at`), so the customer approves the UPI Autopay mandate on
   day 6 and the first charge lands on day 7.
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

India is on Polar's supported list, and individuals qualify — payouts run
through Stripe Connect Express, which reaches India even though standalone
Stripe there is invite-only. You don't need a company.

**Do the sandbox first.** It's a separate account at
<https://sandbox.polar.sh> with its own products, tokens and webhook secrets,
and nothing you do there touches real money. Everything below is done twice:
once in sandbox now, once in production when you go live.

1. **Sign up** at <https://sandbox.polar.sh> with GitHub or email, and create
   an organisation. The slug becomes part of your checkout URLs, so pick the
   name you'd want customers to see.
2. **Create two products** — Products → New Product:
   - *Oykot Money — Monthly*: recurring, **monthly**, **$7.99**, with a
     **7-day free trial**.
   - *Oykot Money — Yearly*: recurring, **yearly**, **$59**, with a
     **7-day free trial**.
   The trial on the product is what makes the global trial "card required":
   checkout takes the card and Polar charges it when the 7 days end. Check
   whether Polar lets you limit trials to one per customer and turn that on,
   or someone who cancels can check out again for another 7 days.
   No benefits or licence keys needed — access is decided by our own
   subscriptions table, not by Polar's entitlements.
   Copy both product ids (they look like `xxxxxxxx-xxxx-…`).
3. **Access token** — Settings → Developers → New Token. Scope it to
   `checkouts:write`, `customers:read`, `subscriptions:read` and
   `webhooks:read`. Copy it once; it isn't shown again.
4. **Webhook** — Settings → Webhooks → Add Endpoint:
   - URL: `https://oykot-money.vercel.app/api/webhooks/polar`
   - Format: **Raw** (not Discord or Slack)
   - Events: `subscription.created`, `subscription.active`,
     `subscription.updated`, `subscription.canceled`, `subscription.uncanceled`,
     `subscription.revoked`. **`subscription.created` is new with the card
     trial**: it's the event that says a trial has started.
   - Copy the signing secret.
5. **Payout account** — Finance → Payout Account → connect Stripe Express with
   your PAN and Indian bank details. This can wait until you're ready to take
   real money, but it's the slowest step, so start it early.

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
- **Polar sandbox**: Stripe's test card `4242 4242 4242 4242`, any future
  expiry and CVC. Polar's own dashboard → Webhooks → your endpoint shows every
  delivery, its response code, and a **Redeliver** button — that's the fastest
  way to debug a handler without paying again.
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

## The yearly offer — and what it commits you to

Yearly isn't sold on a percentage. The pricing page leads with the saving in
**months** (6 free on dollars, 4 on rupees), because that's what people
picture, and then answers the real objection to paying for a year — *what if
I stop using it* — with two promises:

- **A 14-day refund window on a yearly plan.** Ask inside a fortnight and
  the whole year goes back. Monthly keeps its 7 days.
- **The price is locked** for as long as the subscription runs unbroken.

Both are set in `lib/pricing.ts` (`YEARLY_OFFER`) and the refund policy page
reads from the same constants, so they can't drift apart. **They are promises
to a paying customer, not marketing copy** — honour them or change them, in
that one file, before anyone buys.

Practically that means:

- **Refunds are manual.** Razorpay: Dashboard → Transactions → the payment →
  Refund. Polar: the refund is issued by them, from the order in their
  dashboard. Neither is automated in the app, and at this volume neither needs
  to be.
- **"Months free" is floored, never rounded.** `yearlyMonthsFree()` makes the
  claim true at the till. At ₹99 / ₹799 the saving is 3.93 months, so the
  rupee badge says **3 months free**; ₹792 or less would earn 4. The dollar
  side ($7.99 / $59) is 4.6 months, so it says 4. Whatever the price, the
  Razorpay plan and Polar product must carry the same amount as `PRICES`.
- **A price rise doesn't touch existing subscribers.** Razorpay plans are
  immutable — a new price is a new plan, and old subscriptions keep running on
  the old one, so the lock holds by default. On Polar, raise the price by
  creating a new product and leaving the old one live for existing customers.

## Cancelling

Settings → Billing. Dollar customers get Polar's hosted portal; rupee
customers get a button that cancels at the end of the paid period (Razorpay
has no hosted portal). Nobody has to email anyone to stop paying.

## What the code does with all this

- `lib/payments/razorpay.ts` — creates subscriptions, verifies the HMAC.
- `app/api/webhooks/razorpay/route.ts` — the only thing that grants rupee access.
- `app/api/checkout` + `app/api/portal` — Polar's hosted checkout and billing portal.
- `app/api/webhooks/polar/route.ts` — the same job for dollars.
- `lib/payments/store.ts` — the single writer into `subscriptions`; both
  providers translate into its shape and nothing else touches the table.
- `lib/access.ts` — reads that row and answers "what can this user do?". It
  never learns which provider paid.
