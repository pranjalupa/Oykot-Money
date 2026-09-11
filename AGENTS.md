# Oykot-Money — Agent Context

Read this file first, every session. It's the persistent memory for this repo — any LLM
working here should treat it as source of truth for decisions, trajectory, and status.

## Rules for LLMs editing this file (token-efficiency strategy)
- **Append, don't rewrite.** New entries go at the top of "Decisions & Updates," newest first.
- **Bullets, not prose.** One line per fact. No recaps, no restating what git history already shows.
- **Don't duplicate the code.** Stack/config facts belong here only if they're *decisions*
  (why we picked X), not facts derivable from package.json, file tree, or configs — link instead.
- **Keep this file short.** Target under ~150 lines. When it grows past that, move old
  "Decisions & Updates" entries into `/docs/decisions/YYYY-MM.md` and leave a one-line
  pointer here. Never delete decisions, just archive them.
- **Update `Status` every session** you touch code — one or two lines, current state only.
- **Careful with scaffolders.** `next dev` rewrites the `nextjs-agent-rules` block at the
  bottom of this file; leave it alone and keep it committed. A `create-next-app` run will
  clobber this whole file — recover with `git show HEAD:AGENTS.md` if it happens.

## Deploying — read this before you debug a stuck build
Vercel **blocks** any deployment whose commit author it can't match to the account
(`blockCode: COMMIT_AUTHOR_REQUIRED`). It surfaces as deployments sitting at status `UNKNOWN`
with no build logs and a 0ms build — it looks like a queue problem and is not one. The CLI
doesn't show the reason; the API does:
`GET /v6/deployments?projectId=…` → `state`, `seatBlock.blockCode`, `errorMessage`.
This repo's git identity is set locally to `pranjalupa@gmail.com` (the Vercel account email).
There is no global git identity on this machine, so **any new repo will hit this again** —
set `user.email` before the first commit.

## What this is
- Pranjal's personal budgeting tool. Personal/single-user for now.
- Possible future: turn into a SaaS or public app. Not committed to — see trajectory below.
- Owner/account: github.com/pranjalupa
- Product spec — screens, rules, calculations, known gaps: `PRODUCT.md`. Keep it in step
  when behaviour changes.

## Stack (decisions, not an inventory — see package.json for versions)
- **Next.js App Router + TypeScript + Tailwind v4 + shadcn/ui.** Matches the setup in the
  sibling `oykot-product-ds` project, so conventions carry across Pranjal's repos.
- **Icons: Phosphor.** Stored on categories/accounts/people as a string name; resolved
  through an explicit map in `src/components/category-icon.tsx` (not a namespace import —
  keeps the bundle honest and degrades to a Tag icon on an unknown name). Picked from a
  grouped, searchable grid (`icon-picker.tsx`), never a list of raw icon names.
- **Fonts:** Archivo (headings) · Inter (body/UI) · Instrument Serif *italic* (accent only —
  pull quotes and insight lines, never buttons/nav/labels; it's the one serif moment in an
  all-sans system and only reads as intentional if it stays rare). Use the `accent-note`
  utility class, don't reach for the font variable directly.
- **Database: Supabase Postgres via Drizzle** (`postgres-js`, pooled). Provisioned through
  the Vercel Marketplace, so env vars are managed by Vercel — `vercel env pull .env.local`
  to refresh. Migrated off local SQLite when the project went multi-user.
- **Auth: Supabase Auth** — email + password *and* Google OAuth, open signup. `@supabase/ssr`
  with a middleware session refresh (`src/middleware.ts`). Supabase is used ONLY for auth; all
  data access is Drizzle.
  - Social buttons render only when the provider is actually enabled, read from
    `/auth/v1/settings` (`lib/supabase/providers.ts`, 60s cache). Don't hardcode a provider
    button: with the provider off, Supabase answers the authorize call with a raw JSON
    "provider is not enabled" page.
  - OAuth runs as a **server action**, never from the browser client — the PKCE code verifier
    has to be a server cookie for `/auth/callback` to exchange the code.
  - Confirmation and OAuth redirects use the request-derived origin, so localhost and
    production both work with no per-environment config. Supabase only honours those URLs if
    they're in the project's redirect allow-list.
- **Money is integer hundredths everywhere** — stored as `bigint`. Never floats, never major
  units, until `lib/money.ts` formats at the UI edge **in the user's currency**
  (`profiles.currency`). One currency per user and **never converted** — switching relabels.
  Server code passes it explicitly (`getUserCurrency()`); client code reads `useCurrency()`;
  `<Money>` does it for you. Two-decimal currencies only while `MINOR_PER_UNIT` is 100.
  `accounts.currency` is a leftover column — the profile is the source of truth.
- **Hosting: Vercel** (project `oykot-money`, connected to this repo).

## Multi-tenancy — read before writing any query
Every user-owned row carries `userId`. Isolation is enforced in TWO places, and you must
respect both:
1. **Application code is the real enforcement.** Drizzle connects as the table owner, so RLS
   does *not* constrain it. `requireUser()` in `lib/auth.ts` resolves the session user, and
   every query in `lib/budget.ts` filters on that id. Any mutation taking an id from a form
   runs an ownership check first (`ownsCategory` / `ownsAccount` in `app/actions.ts`) — an id
   in a form field is user input.
2. **RLS policies** (`drizzle/rls.sql`) are defence in depth, for anything reaching the data
   through PostgREST with a user JWT. Re-run that file after adding a table.
`ensureUserSetup()` seeds a new account with starter categories and 50/30/20; it's idempotent
and safe to call on every page load.

## Data model (the part worth knowing before touching schema)
Full detail in `src/db/schema.ts` comments. The decisions behind it:
- **Accounts have three kinds**, one net-worth sum, three ways to get a balance:
  - `spending` — bank/cash/wallet/credit card. Balance = opening + transaction effects.
  - `loan` — the ledger for one `people` row (a friend, or a bank you borrowed from),
    linked by `accounts.person_id`. Balance = transaction effects. Positive: they owe you.
  - `asset` — SIP, PF, Emergency Fund. **No transaction history**; balance is a manually
    entered `currentValueMinor`. Deliberately no returns or cost-basis tracking.
- **A transaction skips categorization only when both ends are `spending` accounts.** Moving
  your own money between your own accounts is invisible to the budget. Lending to a `loan`
  account *still carries a category*, so it counts against Wants the way the sheet does, while
  also moving that person's balance.
- **Categories are flat by default** (group → category), because the real sheet is flat across
  all 36 lines. `parentId` allows ONE optional level below (Subscriptions → Netflix) for
  categories that want the resolution. Two levels max — enforced in app code, not the schema.
  A child's `budgetsSeparately` decides whether it carries its own planned amount or rolls up.
- **Group targets:** `group_targets.month = 'default'` (the `DEFAULT_MONTH` sentinel) is the
  split that prefills new months; a row with a real `YYYY-MM` overrides just that month.
  A sentinel rather than NULL because Postgres treats NULLs as distinct, so a nullable month
  would let ON CONFLICT miss and accumulate duplicate default rows. Ships as 50/30/20.
- **A month with no plan inherits the last month that had one** (`ensureMonthPlan`
  in `lib/month-setup.ts`). Only fires when the month has zero budget lines, so it can
  never overwrite an edit or resurrect an amount you cleared.
- **Recurring transactions are materialised lazily**, on opening the month, not by a
  cron — there is no scheduler here. `recurring_rules.lastRunMonth` is what makes it
  idempotent, and generation is restricted to the *current* month so browsing back
  can't invent history.
- **Budget lines are a separate table from transactions** — one planned row per category per
  month vs. many actuals. Different cardinalities; keeping them apart avoids a flag column
  and a `WHERE is_planned` on every query.
- Credit-card support (liability balances, bill payment as transfer) is **modelled but unused**
  — Pranjal has no credit card yet. It's a config flip, not a rebuild, when that changes.
- **`merchant_rules` is groundwork, not a feature.** Table exists (pattern → category, optional
  account) with RLS on, and nothing reads or writes it yet. It's the intended hook for statement
  import — extend it rather than inventing a second mapping mechanism.

## Design tokens
Forest (primary/green) · Lemon (accent) · Stone (neutral) · Clay (destructive).
Live in `src/app/globals.css` as the source of truth. Two rules that matter:
- **Surfaces always come from Stone, both themes.** Forest/Lemon are for actions and emphasis
  only — that's what stops dark mode reading as a green room.
- **Primary swaps Forest → Lemon in dark mode**; dark green has no contrast on near-black.
Visual reference (light/dark, web/mobile toggles): `docs/design-tokens.html`.

## Product trajectory
- **Phase 1 (done):** personal budgeting tool.
- **Phase 2 (done):** multi-user with open signup and per-user isolation.
- **Phase 3 (current, 2026-09-11):** paid SaaS. Plan and build order in `PRODUCT.md` §13.
  Teams and sharing are still out — don't build toward them without being asked.

## Decisions & Updates (newest first — add new entries at top)
- 2026-09-11 (3) — **Charts rebuilt around the question each one answers.** The first set was
  dense (side-by-side halves, 30- and 24-bar charts, heavy stone blocks, duplicated data).
  - Form follows the question: ring (budget used), donut (split of income, net worth mix),
    area (pace, savings, net worth), calendar heatmap (which days), bullet bars (target split),
    ranked bars (categories, merchants), diverging bars (over/under, who owes whom).
  - Building blocks in `components/charts/` (`radial-progress`, `donut`, `area-trend`,
    `column-trend`, `ranked-bars`, `diverging-bars`, `bullet-bars`, `calendar-heatmap`);
    screens compose them in `*-insights.tsx`, which also write the takeaway sentence.
  - Label-heavy bars are plain HTML, not Recharts, so labels never crop on a phone.
  - No y-axis anywhere; every `ChartCard` ends with a takeaway and a "View as table" link.
  - Colour: group shades as before; single measures use `--primary` (supersedes the stone
    accent); ranked category bars take their group's colour; unspent is `--muted` track.
  - New queries: `getGroupTrend`, `getMerchantBreakdown`. Removed the target cards, per-group
    breakdown, income-vs-spending chart and the yearly spending mini-bars (duplicates).
  - Checked with sample data in light, dark and at phone width. Recharts draws nothing in a
    hidden tab (no animation frames) — a blank chart in a background preview isn't a bug.
- 2026-09-11 (2) — **Dates, charts, trial and pricing, legal, data rights, and the bug sweep.**
  - **Time is the user's, not the server's.** The server runs on UTC. `lib/dates.ts`
    (`todayIn`, `currentMonthIn`) takes the profile's timezone, which the browser reports via
    `TimezoneSync`. Never call `new Date()` for "today". `formatDay` parses stored dates as UTC
    so "2026-09-03" can't print as Sep 2. Region (date format) is separate from currency.
  - **Transactions: one validator** (`readTransaction`) for add and edit, and one set of fields
    (`TransactionFields`). Edit can move account and type. Carry-over never fills future months;
    repeats skip archived accounts and categories.
  - **Charts** are shadcn charts (Recharts) inside `ChartCard`, which always offers a Table view.
    `--chart-needs/wants/investments` were computed with the dataviz palette validator in both
    modes. Only those three stack (in that order); single series and budget-vs-spent use the
    stone `--chart-accent`/`--chart-neutral`, because the brand primary collides with the
    group hues.
  - **Net worth history** comes from `net_worth_snapshots`, written by Money and by Home via
    `after()`. It can't be backfilled.
  - **Access:** `subscriptions` plus `getAccess()` in `lib/access.ts`. Every write action calls
    `requireWriter()`, which redirects to `/pricing?trial=ended` when read-only. Profile,
    timezone, export and delete never go through it. Enforcement is behind
    `ACCESS_ENFORCED=true` — leave it off until checkout works.
  - **Delete account** deletes rows in dependency order in one transaction (`transactions.
    account_id` is RESTRICT, so don't rely on the auth.users cascade), then calls
    `auth.admin.deleteUser` through `lib/supabase/admin.ts` (service role, server only).
  - Public routes: `/` (landing when signed out, an exact match in middleware), `/pricing`,
    `/legal/*`, `/auth/*`. Prices live in `lib/pricing.ts`, the legal contact in `lib/legal.ts`.
  - Dialogs close from inside a wrapped `useActionState` action, never an effect. Lint is 0.
- 2026-09-11 — **Profiles and per-user currency** (first slice of SaaS phase 1).
  - `profiles` (name, currency), **created lazily** in `getProfile()`: a user arrives by the
    email form, Google, or predating profiles, and all three pass through a render.
  - Signup puts name + currency in `user_metadata`, because with email confirmation there's
    no session — so no profile row — until the link is clicked. Google gets its name from
    Google and currency from `x-vercel-ip-country`.
  - `<Money>` is now a client component reading a context set in the root layout, so money
    can be formatted deep inside client components without threading the profile through.
  - RLS on 9/9 tables. Dates are still `en-IN` for everyone — known gap.
- 2026-09-11 — **Going SaaS: paid-only with a trial, India and global from day one.**
  Reverses Phase 2's "no billing". Detail in `PRODUCT.md` §13.
  - **Two providers, one `subscriptions` table.** Razorpay (UPI Autopay, ₹) for India; a
    Merchant of Record for everyone else. Not LemonSqueezy: no UPI, no INR settlement, and
    it's being folded into Stripe Managed Payments.
  - **Access is decided in one server-side check** and enforced in every write action, not
    just the UI. Webhooks are the source of truth; the checkout return page is not.
  - **After the trial: read-only, never locked out** — your history stays yours.
  - Seller is an individual (no GST registration yet). Whether global sales through an MoR
    force GST registration is an open question for a CA — don't treat it as settled.
  - Phase 0 (the known gaps) done: the target-split editor moved to the Monthly tab, where
    it sits next to the budget it shapes (Settings keeps a pointer); UI wording is
    Budgeted · Spent · Remaining / Over budget everywhere; transaction delete confirms;
    `createAccount` refuses `kind = loan`, since only `createPerson` may make a ledger.
- Earlier entries (2026-09-01 → 2026-09-03, first build through multi-user launch) archived to `docs/decisions/2026-09.md`.
## Status
Fully workable and deployed at https://oykot-money.vercel.app. Home (Daily/Monthly/Yearly
tabs) / group pages / category detail / Money / People / Settings all read and write against
Supabase, with auth and per-user isolation. Archiving, deleting, drag reordering and the
icon grid are wired everywhere they apply.
**Not built yet:** statement import or any automated entry (deliberately deferred; see the
`merchant_rules` note above).
**Next:** payments — Razorpay, then a Merchant of Record, in test mode (`PRODUCT.md` §13.6,
phases 3–4). Turn on `ACCESS_ENFORCED` only once checkout works. Legal pages are drafts.
**Lint:** clean.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
