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

## Stack (decisions, not an inventory — see package.json for versions)
- **Next.js App Router + TypeScript + Tailwind v4 + shadcn/ui.** Matches the setup in the
  sibling `oykot-product-ds` project, so conventions carry across Pranjal's repos.
- **Icons: Phosphor.** Stored on categories/accounts as a string name; resolved through an
  explicit map in `src/components/category-icon.tsx` (not a namespace import — keeps the
  bundle honest and degrades to a Tag icon on an unknown name).
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
- **Money is integer paise everywhere** — stored as `bigint`. Never floats, never rupees,
  until `lib/money.ts` formats at the UI edge.
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
  - `loan` — one per person ("Rahul"). Balance = transaction effects. Positive: they owe you.
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
- **Phase 2 (current):** multi-user with open signup and per-user isolation. Still no billing,
  teams, or sharing — don't build toward those without being asked.

## Decisions & Updates (newest first — add new entries at top)
- 2026-09-02 — **Recurring, auto-carry, reordering, and the last missing nav link.**
  Added monthly repeats (toggle in the add dialog, managed in Settings), plan carry-over
  to the next month, category reordering, and transaction editing — `updateTransaction`
  had been written but left with no UI. (`setAccountArchived` was in the same state and is
  *still* uncalled — see Status.) `/income` existed via the `[group]` route but had no
  sidebar entry; it does now.
  - Default categories for NEW accounts trimmed from 36 (a copy of Pranjal's sheet) to
    13 generic lines. Pranjal's real budget lives only in `pranjalupa@gmail.com`, loaded
    by `scripts/import-my-budget.ts` (idempotent; reconciles to
    31,600 / 11,000 / 22,267 / 64,867).
  - `pranjal.upadhyay@elivaas.com` is a test account, not a second identity.
  - Watch this: `drizzle/rls.sql` does NOT auto-discover tables. `recurring_rules`
    shipped with RLS off until it was added there by hand. **Add every new table to
    that file.**
- Earlier entries (2026-09-01 → 2026-09-02, first build through multi-user launch) archived to `docs/decisions/2026-09.md`.
## Status
Fully workable and deployed at https://oykot-money.vercel.app. Google sign-in is live
alongside email/password. Month / Daily / Year / group pages / category detail / accounts /
settings all read and write against Supabase, with auth and per-user isolation.
**Not built yet:** statement import or any automated entry (deliberately deferred), and
archiving an account from the UI (`setAccountArchived` exists, nothing calls it).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
