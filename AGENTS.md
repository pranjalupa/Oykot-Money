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
- **Database: SQLite via Drizzle**, file at `./oykot.db`, gitignored. Chosen for zero-setup
  and because personal financial data shouldn't need a cloud round-trip. Drizzle keeps the
  Postgres/Neon path open if this ever becomes multi-user — dialect swap, not a rewrite.
- **Money is integer paise everywhere.** Never floats, never rupees, until `lib/money.ts`
  formats at the UI edge.
- **Hosting:** undecided. Local-first for now; SQLite means it isn't Vercel-ready as-is.

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
- **Group targets:** `group_targets.month IS NULL` is the default that prefills new months;
  a row with a month set overrides just that month. Ships as 50/30/20; Pranjal's default is
  **50/15/35**.
- **Budget lines are a separate table from transactions** — one planned row per category per
  month vs. many actuals. Different cardinalities; keeping them apart avoids a flag column
  and a `WHERE is_planned` on every query.
- Credit-card support (liability balances, bill payment as transfer) is **modelled but unused**
  — Pranjal has no credit card yet. It's a config flip, not a rebuild, when that changes.

## Design tokens
Forest (primary/green) · Lemon (accent) · Stone (neutral) · Clay (destructive).
Live in `src/app/globals.css` as the source of truth. Two rules that matter:
- **Surfaces always come from Stone, both themes.** Forest/Lemon are for actions and emphasis
  only — that's what stops dark mode reading as a green room.
- **Primary swaps Forest → Lemon in dark mode**; dark green has no contrast on near-black.
Visual reference (light/dark, web/mobile toggles): `docs/design-tokens.html`.

## Product trajectory
- **Phase 1 (current):** personal budgeting tool, single user.
- **Phase 2 (future, unscheduled):** possible SaaS / multi-user. Do not pre-optimize for
  multi-tenancy — Phase 1 decisions should stay simple.

## Decisions & Updates (newest first — add new entries at top)
- 2026-09-02 — **First build.** Scaffolded the app and shipped the monthly view, the three
  group pages, and accounts/net-worth. Seeded from the real Aug-26 sheet: 36 categories,
  5 accounts, planned amounts carried into the current month. Totals reconcile exactly against
  the spreadsheet (Needs ₹31,600 / Wants ₹11,000 / Investments ₹22,267 / Income ₹64,867, and
  49%/17%/34% against the 50/15/35 target). Stack + data-model decisions recorded above.
- 2026-09-01 — Design tokens saved to `docs/design-tokens.html` as the working reference.
- 2026-09-01 — Fixed dark mode reading "too green" (surfaces moved to a true-neutral Stone
  scale; the given "Gray" `E1F3E5` reclassified as Forest's lightest tint since it isn't
  neutral). Accent font corrected to **Instrument Serif**.
- 2026-09-01 — Replaced the shadcn stock-preset approach with a custom color/type token system
  built from the 5-color swatch + Archivo/Inter/Instrument Serif. Superseded preset `b2BX1ejq4`.
- 2026-09-01 — Repo created (private). AGENTS.md established as the persistent context file.

## Status
Monthly view, group pages (Needs/Wants/Investments/Income) and accounts/net-worth are working
against real seeded data. **Not built yet:** creating/editing transactions (the app is
read-only so far), daily and yearly views, category CRUD, editing the target split in-app,
and any import/automation.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
