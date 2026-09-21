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
- **Settlements (2026-09-13):** the person is always the counter-account. Lending is
  `transfer` your account → person, with an *optional* category — pick one and it counts as
  spending in that budget. Borrowing is `inflow` person → your account and never carries a
  category, so it's never income. A move between two `spending` accounts has no category and
  is invisible to the budget. Budget totals come from categories, so an uncategorised
  settlement only moves balances.
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
- 2026-09-21 — **Phone screens reworked toward a fintech layout**, on Pranjal's brief
  ("buttons too small, a bit too much"), keeping the existing colours and shadcn.
  - **Chrome first:** page title and its sentence are desktop-only on Home, groups and
    Money — the period already reads as the heading — and the header's Add is hidden on
    phones (kept mounted; `/?add=1` opens it). The month/year control fills the width.
  - **Nothing under 44px.** `IconButton` was 28px and `IconLink` 32px; both are 44 on
    phones, compact from sm up. Tabs 44, list rows 64+. Keep it that way.
  - **Daily hero:** one number, one bar, one sentence, then `QuickActions` — four tiles
    (Add · Budget · Settle · Money), phones only, since desktop has the sidebar.
  - Category rows carry a per-row progress bar; transaction filters fold behind one
    button on phones; long chip labels have short phone variants (`TAB_LABEL_SHORT`,
    `TYPES[].short`) instead of wrapping out of their pills.
  - **Guides off:** `GUIDES_ENABLED = false` in `lib/guides.ts` — same pattern as the
    annotator. The cards, dismissals and Settings' "Show tips again" all still exist.
  - **Fixed:** dnd-kit's `aria-describedby` ids come from a module counter, so any page
    with two sortable lists hydrated mismatched (Money, every load). `DndContext` now
    takes a `useId()`. Drag handles are desktop-only — on phones they truncated names.
- 2026-09-21 — **Real logo in, annotation tool off again.** `ANNOTATIONS_ENABLED = false`;
  nothing deleted, flip it back when notes are wanted. Pranjal supplied the marks, so the
  generated placeholder ring is gone.
  - `components/logo.tsx` holds both: `LogoMark` is the Forest 900 tile with a white glyph
    (the logo's own colours, not theme tokens — it has to survive on an app icon), and
    `Wordmark` is the "Oykot" lettering lifted out of the full lockup, drawn in
    `currentColor` so it follows the text around it. Sources kept at `public/logo-mark.svg`
    and `public/logo-lockup.svg`; **don't retype the path data** — change the files and
    re-lift it with the script in this commit.
  - Used in the sidebar (mark + wordmark, mark alone when collapsed), the phone header, the
    public header, sign-in/sign-up, password reset, the wizard and the pricing card.
  - App icons are rasterised **from the SVG**, not redrawn: 192/512 as-is, a 512 maskable with
    16% inset for Android's crop, 180 full-bleed for iOS (it rounds its own corners), 32 favicon.
- 2026-09-21 — **The site is installable** (`app/manifest.ts`, `viewport` in the layout,
  `public/sw.js`, `/offline`). `viewport-fit: cover` is what makes the safe-area padding in
  `app-nav.tsx` real — without it those insets are zero.
  - **The worker caches no pages, ever.** Every screen is private and a stale budget is worse
    than none: navigations are network-first with an `/offline` fallback, and only Next's
    fingerprinted `_next/static` output is cached. Don't "improve" this into caching HTML.
  - Middleware must keep `/manifest.webmanifest`, `/sw.js` and `/offline` public — a service
    worker that 307s to `/login` can't register at all.
  - **Next:** App Store and Play builds wrap this (Capacitor). Two known blockers when that
    starts: Google refuses OAuth inside a webview (needs the system browser + a deep link),
    and Apple requires Sign in with Apple wherever Google sign-in is offered. Subscriptions
    stay on the web by decision, so store IAP is not in scope.
- 2026-09-18 — **Annotation tool back on** for pranjalupa@gmail.com (`ANNOTATIONS_ENABLED = true`).
- 2026-09-14 — **Annotation tool disabled, not deleted.** `ANNOTATIONS_ENABLED = false` in
  `lib/annotator.ts` hides the launcher and refuses every annotation action; the code, the
  `annotations` table and saved notes stay. Flip it to true to bring it back. Pranjal's account
  was reset to fresh again the same day (demo data removed, onboarding restarts).
- 2026-09-14 — **Mobile first, end to end.** Below `sm` nothing is a table and nothing needs hover.
  - **Every `DialogContent` is a bottom sheet on phones** (`ui/dialog.tsx`), centred from sm up —
    one change covers every form and confirm in the app.
  - Category table → two-line rows ("₹7,000 left" / "₹3,000 spent · Budget ₹10,000 ✎"); the
    budget opens `PlannedSheet` (big number field). Desktop keeps the table and inline input.
  - Transactions: day headers on phones and a whole-row tap opening `TransactionRowSheet`
    (details, Edit, Delete); desktop keeps the date column and inline icons.
  - Charts: 170px tall on phones (220 from sm), tooltip pinned to the top edge; the Chart/Table
    switch becomes a "See all numbers" sheet; Where it goes shows the top 5 with "Show top 8".
  - Yearly month table → rows; Monthly/Yearly stat cards stay three across, compact.
  - Row icon buttons (accounts, Settings categories) fold behind "⋯" via `RowActions`.
  - Pick breakpoints in CSS; `useIsDesktop` (lib/use-media.ts) only where CSS can't decide.
- 2026-09-14 — **Onboarding.** A setup wizard at `/welcome` (accounts + balances → monthly
  income → target split → this month's budget suggested from income × split, unticked starter
  categories retired) and a dismissible **first-use guide on every major flow** (Daily, Monthly,
  Yearly, group pages, Money, Settlements, the Add form, Settings → Categories).
  - `profiles.onboarded_at`: Home redirects to `/welcome` while null; skipping sets it too.
    Profiles existing before this were backfilled, so only new signups see the wizard.
  - `profiles.dismissed_guides` (text[]) holds dismissed guide ids; content lives in
    `lib/guides.ts`, the card in `components/flow-guide.tsx`. The provider keeps dismissals in
    client state because the layout doesn't re-render on navigation. Settings → Show tips again.
  - Pranjal's account was reset to brand new the same day (all budget data deleted; login,
    profile, plan and annotations kept) so it goes through the wizard.
- 2026-09-13 (late) — **Monthly charts back on Recharts, at Pranjal's request.** Your income
  split is a **donut** (income total in the hole) with the group rows beside it; Where it goes
  is a **horizontal bar chart** with each full name drawn *above* its bar via `LabelList`, so
  nothing is clipped. Supersedes the plain-div stacked bar and list from earlier today.
  - Group and category summaries (`BudgetSummary`) now copy the Net worth card: uppercase label,
    one big figure, a divided row of four stats. Money's explainer line under Net worth is gone,
    and so is Daily's days-left/pace line (pace is in the chart).
  - Checked with sample data on a temporary page, desktop and 375px, then removed.
- 2026-09-13 (later) — **Money with people counts in the monthly budget after all.** Pranjal
  budgets month to month: money lent is money you can't spend this month, and a loan is repaid
  out of monthly spending. Supersedes the "loans stay out of the budget" + Forgive design below.
  - **Four locked categories** carry it, found by `categories.system_key` (never by name):
    `lent` Lent out (Wants) · `repaid_out` Paid back (Needs) · `borrowed` Borrowed (Income) ·
    `repaid_in` Got paid back (Income). The spreadsheet's Money Lended / Debt (Repayment Given) /
    Money Borrowed / Debt (Repayment Received) were adopted and renamed.
  - **The user never picks them.** `personEntries` (lib/loan-ledger.ts) decides from the person's
    balance before the payment and **splits a payment that crosses zero**. Hand-picking them in
    Spent/Received is refused; rename, regroup, retire, delete and sub-categories are refused.
  - `ensureLoanCategories` runs from `ensureUserSetup`, so every account has them. Forgive and
    `forgiveDebt` are gone — lending was already counted when it happened.
  - Per person: the locked categories' pages split by person (from `counterAccountId`) instead
    of per-person sub-categories, which would have meant four sub-categories per person.
- 2026-09-13 — **Money with people starts from the person.** Researched Khatabook, Splitwise,
  Wallet by BudgetBakers, YNAB and Monarch; all start from the person, use two buttons, and keep
  loans out of the budget.
  - Settlements rows open a **person panel**: You gave / You got / Settle up / Forgive, history,
    manage. The Add form is **Spent · Received · Person**; **Move** only appears on Money →
    Accounts → *Move money* (or when editing a move).
  - **Lending no longer carries a category** — supersedes the "count as spending" option and the
    sheet-era rule that lending counts against Wants. A loss is recorded by **forgiveDebt**: an
    `outflow` on the person's *loan ledger* with a Needs/Wants category and `source='forgive'`.
    The ledger balance drops to zero, spending accounts don't move, the budget counts it. Forgiven
    rows aren't editable (the form can't pick a ledger as the account).
  - Balances in words: You'll get / You'll give / Settled. No schema change.
- 2026-09-13 — **Second annotation pass: navigation and Monthly reshaped.**
  - **People is gone as a page** — it's the Settlements section of Money (`/people`
    redirects to `/money#settlements`). Money reads: Net worth → Accounts → Settlements →
    Assets → trend. Each person has "+" and "Settle up", which open the Add form prefilled;
    balances only ever change through transactions.
  - **Phones get a bottom tab bar** (Home, Groups sheet, + Add → `/?add=1`, Money, Settings)
    instead of the ≡ drawer. Toaster and the annotation launcher sit above it.
  - **Monthly: one "Your income split" card** replaces the pie and the target card, which
    both said "Needs 33%". "Where it goes" is a list with a bar under each name (names were
    clipped at 13 chars beside the chart). Both are plain divs — `pie-split` and
    `bar-ranking` are deleted, so Recharts is now line and column only.
  - Daily hero: one number, one bar, one line. Category rows lost their progress bar.
  - The Add form can create a person or category inline (`quickAddPerson`,
    `quickAddCategory`). Settlement chips read "Money to them / Money from them" so
    repaying and being repaid fit the same two moves.
  - Kept Accounts on Money rather than moving them to Income: Income is a budget group,
    accounts are where money sits.
- 2026-09-13 — **First annotation pass (13 fixes).** Charts lost their caption sentences and
  "View as table" link; `ChartCard` now has a Chart / Table switch top right and no
  `takeaway`/`note` props. Group colour dots removed from headings and labels. Whole
  category rows click through. Native `<select>`s get one drawn chevron (unlayered rule in
  `globals.css`). Desktop sidebar collapses to icons — state in a `sidebar` cookie mirrored
  on `<html data-sidebar>`, which the content offset follows in CSS. Settings Save appears
  only when something changed. Transactions show the date in its own column. Categories
  can be deleted from their own page. Assets are no longer offered as a transfer target.
- 2026-09-13 — **In-app annotation tool, for Pranjal and the coding agent only.** Point at any
  element (or select text) on any page, write a note; saved to `annotations` with the path,
  a CSS selector, and the element's text as a fallback when the selector stops matching.
  - Gated by an email list in `lib/annotator.ts`, checked in the layout *and* in every
    action (`app/annotation-actions.ts`). Not a product feature — don't surface it to users.
  - **"Check the annotations" means run `npx tsx scripts/annotations.mts list`.** `show`,
    `reply`, `resolve <id> "what changed"`, `reopen`, `delete` also work; the reply shows
    under the note in the app.
  - Undo/redo covers add, edit, resolve/reopen and delete for the session; delete is undone
    by re-inserting the same row.
  - Table created by hand (SQL matching `schema.ts`) plus a re-run of `drizzle/rls.sql`.
- 2026-09-12 — **Charts cut from 15 to 6, and back to plain forms.** The rebuild the day
  before was too much: rings, a calendar heatmap, diverging and bullet bars, and several
  charts restating a number already on the page.
  - **Only four chart types now** — line, column, horizontal bar, pie — all Recharts inside
    `ChartContainer`. Primitives: `line-trend`, `bar-trend`, `bar-ranking`, `pie-split`.
    The eight bespoke ones are deleted; don't reintroduce a hand-rolled SVG chart.
  - **The bar for keeping a chart:** it must show something the figures beside it don't —
    shape over time, or a ranking. That's what removed the rings (a dial of one percentage
    the stat grid already prints), the calendar (the transaction list is grouped by day),
    over/under (same rows as "Where it goes"), the net-worth donut and the People bars
    (both lists sit right underneath), and the yearly savings-rate ring, running total and
    spending mix (all restatements of "Saved each month").
  - What's left: Daily → Spending pace. Monthly → Where your money went, Where it goes.
    Yearly → Saved each month. Group + category → Last six months. Money → Net worth.
  - `getMerchantBreakdown` went with its chart — merchant strings are parsed from
    transaction notes, so it was the least trustworthy figure in the app.
  - **Fixed a live bug in passing:** `groupColor` was exported from a `"use client"` module
    and called from the group and category server components, so both pages had been
    throwing since b2e9780. It now lives in `lib/chart-colors.ts`. **A plain function
    exported from a client module can be rendered on the server, never called** — put
    shared helpers in `lib/`.
  - Checked in a browser with sample data, light and dark, desktop and 375px.
- Earlier entries (2026-09-01 → 2026-09-11: first build, multi-user launch, profiles and
  per-user currency, the SaaS decision, dates/timezone, access and legal, and the
  first chart rebuild) archived to `docs/decisions/2026-09.md`.

## Status
Fully workable and deployed at https://oykot-money.vercel.app. Home (Daily/Monthly/Yearly
tabs) / group pages / category detail / Money / People / Settings all read and write against
Supabase, with auth and per-user isolation. Archiving, deleting, drag reordering and the
icon grid are wired everywhere they apply. Six charts total, all plain Recharts forms.
Annotation tool (owner-only) on again since 2026-09-18 (`ANNOTATIONS_ENABLED`). Onboarding wizard and first-use guides
live since 2026-09-14.
**Not built yet:** statement import or any automated entry (deliberately deferred; see the
`merchant_rules` note above).
**Next:** payments — Razorpay, then a Merchant of Record, in test mode (`PRODUCT.md` §13.6,
phases 3–4). Turn on `ACCESS_ENFORCED` only once checkout works. Legal pages are drafts.
**Lint, typecheck and build:** clean.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
