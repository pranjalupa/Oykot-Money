# Oykot Money — Product Spec

*Last verified against the code: 2026-09-11*

This document describes what Oykot Money **is and does today**: screens, rules, the numbers
it shows and how each is calculated. It's the product view. For engineering decisions and
their reasons, see [`AGENTS.md`](AGENTS.md) and [`docs/decisions/`](docs/decisions/).

If this file and the app disagree, the app is right and this file is stale — fix it.

---

## 1. What it is

A personal budgeting app built around the **50/30/20 idea**: split your income between
**Needs**, **Wants** and **Investments**, plan how much goes to each category every month,
then log what actually happens and watch the two meet.

It began as a replacement for Pranjal's monthly budget spreadsheet and still reads like one —
plan against actual, category by category — but adds what a sheet can't: a daily
"safe to spend" figure, lending and borrowing ledgers, net worth, and recurring entries.

| | |
|---|---|
| **Live at** | https://oykot-money.vercel.app |
| **Who it's for** | Pranjal first; open signup means anyone can create an account |
| **Currency** | One per user, chosen at signup — ₹, $, €, £, A$, CA$, S$ or AED. Changeable in Settings; amounts are never converted |
| **Dates** | In the user's regional format ("3 Sept" / "Sep 3"), and "today" in their own timezone |
| **Phase** | Phase 3, paid SaaS, in progress. Trial, pricing, legal pages, export and deletion are live; **payments aren't connected yet** (§13) |
| **Platforms** | Web, responsive — sidebar on desktop, drawer menu on mobile. Light, dark and system themes |

---

## 2. Principles

These explain most of the product's choices. When a new feature is in doubt, check it
against these.

1. **Plan against actual, like the sheet.** Every screen answers "what did I plan, what
   happened, what's left". The spreadsheet mental model is the product's backbone.
2. **Assumed money never looks like real money.** Anything the app infers rather than
   records (assumed-spent Needs) is visibly marked.
3. **History is never silently rewritten.** Deleting something with transactions either keeps
   the money (categories) or is refused (accounts, people). Archiving is always available.
4. **Moving your own money isn't spending.** A transfer between two of your own accounts
   never touches the budget.
5. **Say what an icon does.** Every icon-only control has a tooltip and an accessible name.
6. **Small defaults, not someone else's budget.** New users start with 13 generic categories
   and nothing budgeted.
7. **No automation you didn't ask for.** No bank sync, no statement import, no scheduler —
   things happen when you open the app.

---

## 3. Vocabulary

The words the product uses, and what they mean. The code follows these too.

| Term | Meaning |
|---|---|
| **Group** | One of four buckets: **Needs**, **Wants**, **Investments**, **Income**. Fixed; can't be added or renamed. |
| **Category** | A line inside a group — "Rent", "Groceries". Can have one level of sub-categories. |
| **Budgeted** | What you plan to spend (or receive) in a category this month. |
| **Spent** / **Received** | What actually happened. "Received" is used for Income. |
| **Remaining** | Budgeted minus Spent. Negative (shown in red) means over budget. |
| **Assumed** | A Needs amount counted as spent without a transaction. See §6.6. |
| **Target split** | The percentage of income you *aim* to put in each spend group (e.g. 50/30/20). |
| **Account** | A place **your** money sits — bank, cash, UPI wallet, credit card. |
| **Asset** | Something you own with a value you type in — SIP, PF, emergency fund. |
| **Person** | Anyone on the other side of a loan: a friend (**person**) or a bank/NBFC (**lender**). |
| **Loan / balance** | The running amount between you and a person. Positive = they owe you. |
| **Net worth** | What you hold, plus what you're owed, minus what you owe. |
| **Safe to spend** | How much you can spend per day for the rest of the month and stay on plan. |
| **Retire / Archive** | Hide something from new use while keeping all its history. |
| **Currency** | What your budget is counted in — one per user. Changing it relabels your amounts; nothing is converted. |

These words are used on every screen. A total reads "₹X of ₹Y budgeted", and Remaining
becomes **Over budget**, in red, once it goes below zero.

---

## 4. Navigation and routes

**Sidebar (desktop):** Home · *Groups:* Needs, Wants, Investments, Income · Money · Settings.
Theme toggle and Sign out sit at the bottom, with your name and email. A button at the top
collapses it to icons; the choice is remembered.

**Phones:** a slim top bar (logo, theme, sign out) and a **bottom tab bar** — Home · Groups
(opens a sheet with the four groups) · **+** (Add transaction) · Money · Settings.

| Route | Screen | Signed out? |
|---|---|---|
| `/` | Landing page when signed out; Home with the **Daily** tab when signed in | ✓ |
| `/?view=month` · `/?view=year` | Home, **Monthly** · **Yearly** tab | |
| `/needs` `/wants` `/investments` `/income` | Group pages | |
| `/category/[id]` | One category's detail, trend and transactions | |
| `/money` | Net worth, accounts, settlements (people), assets, net worth history | |
| `/?add=1` | Home with the Add transaction form open (the phone **+** tab) | |
| `/settings` | Profile, billing, repeats, categories, your data | |
| `/pricing` | Plans, trial and FAQ | ✓ |
| `/legal/privacy` · `/legal/terms` · `/legal/refunds` | Legal pages | ✓ |
| `/login` `/signup` | Authentication | ✓ |
| `/auth/forgot` · `/auth/reset` | Request a reset link · choose a new password | ✓ |
| `/api/export?format=csv\|json` | Download your data | |

**Period in the URL.** Month and year are URL parameters (`?month=2026-09`, `?year=2026`),
so every view is linkable and survives a reload. Switching tabs keeps the period you were on.

**Old routes redirect:** `/daily` → Daily tab, `/year` → Yearly tab, `/accounts` → `/money`,
`/people` → `/money#settlements`.
Signed-out visitors to any other page go to `/login?next=…`.

---

## 5. Screens

### 5.1 Home

A header shows the current period and a **month switcher** (‹ month › and a "Today" link
when you've navigated away) — or a **year switcher** on the Yearly tab — plus the global
**Add** transaction button. Below it, three tabs.

#### Daily (default)
Answers "can I spend this today?"

- **Today** — **safe to spend today** as one big number, and one bar for how much of the
  month's Needs + Wants budget is gone ("₹X spent of ₹Y · ₹Z left"). Pace lives in the chart
  below.
- **Spending pace** — a line of spending so far against a dashed line to your budget at
  month's end. Assumed fixed costs count from day one. Daily's only chart: the transactions
  below already break the month down day by day.
- **Transactions** — everything logged this month (up to 300), each editable or deletable,
  with **search** (merchant, category, account, amount) and filters for type and category.

#### Monthly
Answers "how is this month going against the plan?"

- **Empty state** when nothing is budgeted: *Set your budget* (goes to Needs) and
  *Copy last month*.
- **Income · Expenses · Saved this month** — each against its budget.
- **Your income split** — a donut of the month's income (received, or budgeted until any
  arrives) split into Needs, Wants, Investments and Not spent, with the income total in the
  middle. Beside it, a row per group: share spent against its target (red when over), with
  amounts spent and budgeted, plus a Not spent row. *Adjust split* opens the editor here
  (§6.7). Group names link to their pages.
- **Where it goes** — a horizontal bar chart, biggest first: each category's full name above
  its bar, the amount at the end, coloured by group and red when over budget. The tooltip shows
  what was budgeted. Top 8.

#### Yearly
Answers "how did the year go?"

- Totals for **Income**, **Spent** and **Saved**.
- **Saved each month** — above zero in green, below in red, with the year's savings rate as
  the takeaway. The year's only chart.
- **Month by month** — income, spent and saved for each month; tap a month to open it.

### 5.2 Group pages — Needs, Wants, Investments, Income

- **Budget summary** — laid out like Money's Net worth card: what's left (or how far over) as
  the headline, then Spent · Budgeted · Used · Remaining in one divided row.
- **Last six months** — six columns, this month solid, with this month's budget as a dashed
  line and a comparison to your average.
- **Category table** with columns **Category · Budgeted · Spent · Remaining**:
  - **Budgeted edits inline** — the figure shows a pencil and a dashed underline; click it,
    type, Enter or click away to save.
  - Sub-categories are indented under their parent.
  - Remaining turns red when a line is over.
  - A **Total** row at the bottom.
  - Categories with nothing budgeted and nothing spent are hidden behind
    *Show N untouched categories*.
  - Assumed amounts show muted with a repeat mark.
  - Each row opens the category.
- **Add category**, optionally as a sub-category of an existing one.

### 5.3 Category detail — `/category/[id]`
The category's budgeted, spent and remaining for the month with a progress bar, then every
transaction in it that month, with an **Add** button. If the whole figure is assumed, the empty
list explains: *"The ₹X above is the budgeted amount, counted automatically. Add a
transaction and the real figure replaces it."*

The same **budget summary** and **Last six months** chart as the group pages.

### 5.4 Money — `/money`
Top to bottom:
- **Net worth** headline, broken down into **Cash · Assets · Owed to you · You owe**, with a
  *See who* link down to Settlements when anyone owes or is owed.
- **Accounts** — your spending accounts, with balances and subtype (Bank, Cash, UPI wallet —
  "Wallet" outside India — Credit card). **Move money** in the header moves between them.
- **Settlements** (§5.5) — the people you lend to and borrow from.
- **Assets** — with their value and when it was last updated.
- **Net worth over time** — a line, one point per month. History starts 2026-09-11; it can't
  be rebuilt backwards because assets keep no history.
- Per account row: **drag to reorder**, **edit**, **archive**, **delete**.
- **Add account** — Spending (name, type, current balance) or Asset (name, current value).
  People are added in Settlements. Spending accounts can be excluded from net worth.

### 5.5 Settlements — `/money#settlements`
Was the separate People page until 2026-09-13; `/people` redirects here.
- **Owed to you** and **You owe** totals.
- One row per person: icon, name, optional handle, **owes you / you owe / settled up**, and the
  amount.
- Rows are quiet — name, **You'll get / You'll give / Settled**, amount — and **tapping one opens
  the person**. Rows can still be dragged to reorder.
- **The person panel:** the balance in words; **You gave** and **You got** (amount, date, account
  — the last one you used — and a note, with a line saying which category it will count in);
  **Settle up** (the same form with the full amount and the right direction); their **history**;
  and edit, archive, delete.
- A balance only ever changes through a transaction, and **every payment also counts in that
  month's budget** (§6.4).
- **Add person** — name, optional handle ("@rahul" or a phone number, to tell two Rahuls
  apart), **A person** or **A lender**, and an icon. A note can be added when editing.
- Archived people are hidden behind *Show N archived*.

### 5.6 Settings — `/settings`
- **Profile** — your name, currency and **date format** (region). Picking a different currency shows, before you save,
  exactly what changes: "₹500 becomes $500" — the numbers stay, only the symbol and format change.
- **Target split** — a pointer to the Monthly tab, where the split is now edited.
- **Repeats every month** — every recurring rule, with pause/resume and remove.
- **Categories** — all categories by group: drag to reorder, edit (name, group, parent,
  icon), assume-spent toggle (Needs only), retire/restore, delete. Retired ones are hidden
  behind a toggle.
- **Money and settlements** — links to Money and its Settlements section.
- **Billing** — trial or plan status, a link to pricing, and a note that payments aren't live.
- **Your data** — download transactions (CSV) or everything (JSON), and **delete your account**
  (type DELETE to confirm). Both work whatever your plan.

### 5.7 Sign in and sign up
Email and password, plus **Continue with Google** (shown only while Google is enabled in
Supabase). Signup is open to anyone and uses email confirmation. The first page load
after signup seeds starter data (§6.1).

Signing up asks for your **name** and **currency**. The currency is pre-selected from the country
you're visiting from (₹ in India, € in the eurozone, $ where there's no closer match). Google
sign-ups skip the form: the name comes from Google and the currency from your location. Both can
be changed in Settings. Your name shows at the bottom of the sidebar.

**Forgot password?** on the sign-in form emails a one-time link. It opens a page to choose a new
password, then signs you straight in. The request form answers the same way whether or not an
account exists, so it can't be used to find out who's registered.

### 5.8 Landing — `/` when signed out
A short page: headline, what the app does in four blocks (plan, safe to spend, lend and borrow,
fixed bills), and a *Start your 14-day free trial* call to action. No card needed.

### 5.9 Pricing — `/pricing`
One plan with everything in it. A monthly/yearly switch (yearly shows the saving), ₹ or $
pre-selected from where you're visiting and switchable, the feature list, and an FAQ. The button
depends on who's looking: *Start 14-day free trial* for visitors; *Upgrade — checkout opens soon*
(disabled, with an honest note) for trial users; *You're all set* for paid or complimentary.
Reached with `?trial=ended` it opens with an explanation.

### 5.10 Legal pages — `/legal/*`
Privacy policy, Terms of service and Refund policy, naming Pranjal Upadhyay, Delhi, as
responsible, with `pranjalupa@gmail.com` as the contact. **Drafts** — review before relying on
them. Linked from every public page's footer.

### 5.11 Trial banner
A single line at the top of every signed-in page: *Free trial · N days left · See plans*. It
turns urgent in the last three days and after the trial ends, and disappears once someone is
paid or complimentary. It never blocks the page.

---

## 6. How things work

### 6.1 A new account
On first load a new user gets:
- **13 categories**, nothing budgeted —
  Needs: Rent, Groceries, Bills & Utilities, Transport, Health ·
  Wants: Eating Out, Shopping, Subscriptions, Entertainment ·
  Investments: Savings, Investments ·
  Income: Salary, Other Income.
- **2 accounts** — Bank Account and Cash.
- **Target split 50 / 30 / 20.**

- **A profile** — name and currency, from the signup form, or from Google and your location.

Seeding runs once and is safe to repeat.

### 6.2 Planning a month
- **Carry-over.** Opening a month with *no* budgeted amounts copies the most recent earlier
  month that had some. It only carries into the current month or earlier — a future month
  stays empty until it arrives (or you press *Copy last month*), so later edits still reach it. It never runs on a month where any amount exists — including one you
  deliberately set to zero — so it can't overwrite an edit.
- **Copy last month** does the same on demand from the empty state.
- **Budget inline** from any group page's table.

### 6.3 Logging a transaction — the Add dialog
Available on Home, every group page and every category page.

| Tab | Asks for | Category | Effect |
|---|---|---|---|
| **Spent** | From account | Needs, Wants or Investments | Money leaves the account and counts against the category |
| **Received** | Into account | Income | Money arrives and counts as income |
| **Person → You gave** | Person, paid from | Picked for you: Lent out or Paid back | Your account goes down; counts as spending; they owe you more (or you owe them less) |
| **Person → You got** | Person, received into | Picked for you: Borrowed or Got paid back | Your account goes up; counts as money in; they owe you less (or you owe them more) |
| **Move** | From account → To account | None | Between your own accounts. Only on Money → Accounts → *Move money*, or when editing a move |

Fields: amount (₹), date, account(s), category (Spent and Received only), note, and *Repeat every
month*. The person and category dropdowns end with **+ Add person…** / **+ New category…**.

**The budget rule:** everything that leaves or enters your hands this month counts — including
money with a person, in its locked category (§6.4). Only a move between your own accounts has no
category. The four locked categories can't be picked by hand in Spent or Received.

**Validation:** date must be valid, amount greater than zero, an account must be one of yours,
money from a person must come from a person, a move needs a different destination, and Spent or
Received need a category.

**Editing** changes anything, including the account and the type; both balances follow. Add and
edit share the same fields and the same validation. Archived accounts, people and retired
categories aren't offered — except those an entry being edited already uses.

### 6.4 Lending and borrowing
Start from the person (Money → Settlements → tap them), or the **Person** tab in Add.
You only ever choose **You gave** or **You got**. Each payment moves your account, moves the
person's balance, and counts in that month's budget in one of four **locked categories**, picked
from the balance before it:

| You tap | When | Category | Budget |
|---|---|---|---|
| You gave | They don't owe you / nothing open | **Lent out** (Wants) | Spending |
| You gave | You owed them | **Paid back** (Needs) | Spending |
| You got | You don't owe them / nothing open | **Borrowed** (Income) | Money in |
| You got | They owed you | **Got paid back** (Income) | Money in |

A payment that crosses zero is **split**: paying Rahul ₹3,000 when you owe him ₹1,000 records
₹1,000 Paid back and ₹2,000 Lent out. **Settle up** is the same form, prefilled with the whole
balance. A bank loan works the same way — take it as Borrowed, pay each EMI as Paid back.

**Locked:** the four can be budgeted and reordered, but not renamed, moved, retired, deleted or
given sub-categories. Their category pages show a **By person** breakdown instead.

Balances read in words: *You'll get ₹2,000* · *You'll give ₹500* · *Settled*. The two-button,
start-from-the-person flow follows Khatabook ("You gave / You got") and Splitwise (Settle up).

### 6.5 Recurring transactions
Tick *Repeat every month* when adding a transaction. From then on:
- It's added **when you open the current month** — there's no background scheduler.
- **Only the current month** is filled: browsing back won't invent history, browsing forward
  won't pre-spend.
- It lands on the same day each month; a day past the month's end is moved to the last day
  (the 31st → 28/29 February).
- It's **never added twice**, even if the page loads twice at once.
- Added transactions carry a repeat mark in the list.
- Manage in Settings: edit the amount, day or label, pause, resume, or remove. Removing stops
  future ones and keeps the ones already added.
- A repeat never posts into an archived account or person, or a retired category.

### 6.6 Assume spent (fixed Needs)
For costs you know in advance — rent, an EMI, a gym membership.
- Switch it on per category in **Settings → Categories** (the repeat icon).
- The category's budgeted amount counts as **spent**, with no transaction needed.
- A real transaction that month **replaces** the assumption rather than adding to it:
  rent budgeted at ₹15,000 that actually goes out at ₹15,400 shows ₹15,400.
- **Needs only.** Not available on a sub-category that rolls its budget into its parent,
  since it has no budget of its own.
- Nothing is written to your transactions. Turning it off restores exactly what you logged.
- Shown muted with a repeat mark, and affects Daily's safe-to-spend and the Yearly totals.
- Best kept for **fixed** amounts. Turning it on for groceries shows them fully spent on
  the 1st of the month, which makes safe-to-spend too pessimistic early on and hides real
  overspending.

### 6.7 Target split
The split is a goal; the budget is what you actually set. The app shows both so you can see
the gap. The **default** applies to every month; a **this-month** override bends one month
without changing the default. Edit it on the Monthly tab under *Adjust split*: the three
percentages must add up to 100%, and *Reset this month to default* removes an override.

### 6.8 Ordering, archiving and deleting

| | Reorder | Archive | Delete |
|---|---|---|---|
| **Category** | Drag, within its group | *Retire* — hidden from new transactions, history kept | Transactions **stay** and count, but become uncategorised; sub-categories and its monthly repeats are deleted too. The confirm dialog shows the counts first |
| **Locked category** (Lent out, Paid back, Borrowed, Got paid back) | Drag | No | No — they back You gave / You got |
| **Account / asset** | Drag | Yes — asks first if it still holds money, because archived items leave net worth | **Only if it has no transactions** — otherwise refused, with a suggestion to archive |
| **Person** | Drag | Yes — same warning if they still owe or are owed | **Only if they have no transactions** — otherwise refused |
| **Transaction** | — | — | From the list, after a confirm — it can't be undone |

*Forms close themselves on success and keep what you typed on an error.*

Drag works by keyboard too: focus the handle, then use space and the arrow keys.

### 6.9 Dates and timezone
Your browser reports its timezone, which is saved to your profile and updated if you travel.
"Today", "this month", default dates on new transactions, the day repeats post, and Daily's days
left are all worked out in that timezone — the server runs on UTC, which used to show Indian users
yesterday until 5:30 am. Dates display in your region's format.

### 6.10 Trial and access
Every new account gets a **14-day free trial**, counted from signup, no card. The owner's account
is complimentary. One server-side check decides access — *trial*, *active*, *grace* (a few days
after a failed renewal), *complimentary* or *expired* — and every action that changes data asks it.
When access has run out **and enforcement is on**, a change sends you to pricing instead of saving;
reading and exporting always work. **Enforcement is off** (`ACCESS_ENFORCED`) until payments exist,
so nobody is locked out with no way to pay.

### 6.11 Your data
Export gives you transactions as a spreadsheet-ready CSV, or every table as JSON. Deleting your
account removes all your data in one transaction, then your login, then signs you out — also
allowed when access has run out.

---

## 7. Calculations

All money is stored in whole **hundredths** (paise, cents) and only turned into your currency
for display, with that currency's grouping — 1,00,000 for rupees, 100,000 elsewhere — so there is
no rounding drift. Decimals show only when an amount has them. Charts use compact forms:
₹1.2K, ₹3.4L, ₹1.1Cr for rupees; $1.2K, $3.4M, $1.1B for everything else. **Changing currency
relabels amounts; nothing is converted.**

| Figure | How it's worked out |
|---|---|
| **Spent** (category) | Sum of the month's transactions in the category, **or** its budget if assumed and nothing was logged. A parent includes its sub-categories. |
| **Budgeted** (parent) | Its own amount, plus sub-categories that don't budget separately. |
| **Remaining** | Budgeted − Spent. For Income, receiving more than planned is good. |
| **Saved this month** | Income − (Needs + Wants + Investments). |
| **Planned % / Actual %** | A group's budgeted (or spent) amount as a share of budgeted (or received) income. |
| **Left in plan** (Daily) | (Needs + Wants budgeted) − (Needs + Wants spent). Investments excluded — that money is meant to leave. |
| **Safe to spend / day** | Left in plan ÷ days left in the month, counting today. For a past or future month, the whole month's length. Zero once the plan is used up. |
| **Spending account balance** | Opening balance + money in − money out, including transfers. |
| **Person balance** | The sum of transfers to and from them. Positive = they owe you. |
| **Asset balance** | The value you last entered. No returns or cost basis. |
| **Net worth** | Cash in spending accounts (those included in net worth) + assets + owed to you − what you owe. |

---

## 8. Data

Eleven tables, all per user.

| Table | Holds |
|---|---|
| `categories` | Name, group, optional parent, icon, order, retired, budgets-separately, assume-spent |
| `budget_lines` | One budgeted amount per category per month |
| `group_targets` | Target split — one default and optional per-month overrides |
| `transactions` | Date, amount, type, account, destination, category, merchant, note, source (manual or recurring) |
| `recurring_rules` | A repeating transaction: amount, type, accounts, category, day of month, active, last month run |
| `accounts` | Spending accounts, assets, and each person's loan account |
| `people` | Name, handle, person or lender, icon, note, archived, order |
| `profiles` | Your name, currency, region (date format) and timezone — one row per user |
| `subscriptions` | Trial and plan status — one row per user; payment providers will write here |
| `net_worth_snapshots` | Net worth as last seen each month, for the history chart |
| `merchant_rules` | "Merchant contains X → category Y". Unused groundwork for statement import |

**Isolation.** Every row belongs to a user. The app checks ownership on every read and every
change, including any id that arrives from a form. Row Level Security is enabled on all eleven
tables as a second layer; anonymous access is revoked.

---

## 9. Technology and hosting

| | |
|---|---|
| **App** | Next.js 16 (App Router), React 19, TypeScript |
| **UI** | Tailwind CSS v4, shadcn/ui on Base UI, Phosphor icons (137 available), shadcn charts on Recharts, dnd-kit for drag, sonner toasts |
| **Auth** | Supabase Auth — email/password and Google |
| **Database** | Supabase Postgres via Drizzle ORM |
| **Hosting** | Vercel, functions in **Mumbai (bom1)**, next to the database |

---

## 10. Design

- **Colours:** Forest (primary green) · Lemon (accent) · Stone (neutral surfaces) · Clay
  (destructive). In dark mode, primary becomes Lemon because dark green disappears on
  near-black; surfaces always stay neutral Stone. Reference: `docs/design-tokens.html`.
- **Group colours** mark Needs, Wants, Investments and Income everywhere they appear.
- **Type:** Archivo for headings, Inter for everything else, and Instrument Serif italic
  only for occasional accent lines — never on buttons or labels.
- **Icons:** Phosphor duotone, picked from a searchable grid grouped by theme. Searching a
  group name finds its icons ("food" finds the fork).
- **Tooltips** on every icon-only button, suppressed on phones where there's no hover.
- **Charts are the plain four** — line, column, horizontal bar and pie — and there are six of
  them in the whole app. An earlier set reached for a bespoke form per question (rings,
  a calendar heatmap, diverging and bullet bars); it read as busy, and most of those charts
  restated a figure already on the page. A chart now has to earn its place by showing
  something the numbers next to it don't: shape over time, or a ranking.
  - Historical note, so the reasoning isn't lost: the retired forms were a ring for
  "how much is used", a donut for "where did it go", an area for a trend, a calendar for
  "which days", bars from a centre line for over/under and who-owes-whom.
  - Quiet by default: generous space, no y-axis, a faint grid or none, soft fills, rounded ends.
  - Every chart ends with **one plain-language takeaway** and a small **View as table** link.
  - Group colours come from chart-only shades (`--chart-needs`, `--chart-wants`,
    `--chart-investments`), checked for colour-blind separation and contrast in both themes.
    Single measures use the brand primary; money not spent takes the neutral stone.
  - Category names are capped at 13 characters on the bar chart's axis and never wrap, so a
    long name can't collide with the row above it on a phone. The full name is in the
    tooltip and the table.

---

## 11. Known gaps and issues

**Not yet verified by use**
1. Signed-in screens from 2026-09-03 and 2026-09-11 — tabs, People, drag, charts in real data,
   editing, trial banner, billing, export, delete — passed typechecks, builds and route checks.
   The public pages and every chart (with sample data, both themes) were checked in a browser.
   Nobody has clicked through the signed-in screens yet.

**Needs a decision or setup**
2. **Legal pages are drafts.** Review them — ideally with a lawyer — before taking payments.
3. **Payments aren't connected.** Upgrade buttons are disabled and say so; `ACCESS_ENFORCED`
   stays off until checkout works (§13.6).
4. **Delete account in production** needs `SUPABASE_SERVICE_ROLE_KEY` in Vercel's environment.
   It's in `.env.local` (pulled from Vercel), so it should already be there.

**Known limits**
5. Net worth history only starts from 2026-09-11.
6. In dark mode the Wants chart shade is a green-olive (`#62a611`) rather than the lemon used in
   the UI — lemon is too light to pass the chart checks on a dark card.

**Fixed 2026-09-11** — kept so the history is visible:
- *Add account → Person* made an orphan loan account; transaction delete had no confirm; the
  target-split editor lived in Settings; wording varied between screens; template README.
- Archived items in pickers; category delete silently removed repeats; repeats posted into
  archived items; carry-over froze future months; no forgot-password; no loading, error or
  404 screens; edit couldn't change account or type; repeats weren't editable; tables scrolled
  sideways on phones; no transaction search; archiving a balance silently changed net worth;
  server-clock "today"; Indian date format for everyone; 11 lint errors (now 0).

---

## 12. Out of scope, on purpose

- **Statement import or bank sync.** Deferred. `merchant_rules` is the planned starting point.
- **Teams and shared budgets.** Not being built without an explicit decision. (Billing is now
  planned — see §13.)
- **Investment returns and cost basis.** Assets are a number you type in.
- **Credit cards.** Supported by the data model (as liabilities, with bill payment as a
  transfer), but not surfaced as a feature yet.
- **Scheduled jobs.** Recurring entries and carry-over happen when you open the app.
- **Other currencies.**

---

## 13. Monetisation plan — draft

*Status: **plan**, agreed direction 2026-09-11. Nothing here is built yet. Items marked
**Decide** need a call before that part is built.*

### 13.1 What's decided

| | |
|---|---|
| **Model** | Paid only — **no free tier**, a **free trial** first |
| **Price range** | **$3–5 / month** or **$29–39 / year** |
| **Trial** | 14–30 days |
| **Markets** | **India and global, from day one** |
| **Seller** | Pranjal as an **individual** — no company, no GST registration yet |

### 13.2 Proposed specifics — **Decide**

| Question | Proposal | Why |
|---|---|---|
| Global price | **$4 / month, $36 / year** | Inside the range; yearly works out to $3/month, a clear reason to pay annually |
| India price | **₹249 / month, ₹1,999 / year** — set deliberately, not converted | A straight conversion of $4 lands above ₹300. Worth testing, not a settled number |
| Trial length | **14 days** | Enough to set a budget and live with it for two weeks. Longer trials delay the decision without adding much |
| Card to start the trial | **No card needed** | A budgeting app has to earn trust with your money data before asking for a card |
| After the trial | **Read-only, never locked out** | You can still see and export everything; you just can't add or edit. Matches principle 3 — your history is never taken from you |
| Existing 3 accounts | Pranjal's: **free forever** (owner). The other two start the trial at launch | Only one account has any transactions |

### 13.3 How payment works — two providers

Which provider you see depends on your **billing country**. It defaults from your location at
checkout and you can change it. It's saved with the subscription so it can't flip mid-period.

| | **India (₹)** | **Everyone else ($)** |
|---|---|---|
| **Provider** | **Razorpay Subscriptions** | A **Merchant of Record** — **Decide**: Dodo Payments or Paddle |
| **Payment methods** | **UPI Autopay** and card mandates | Cards and local methods, via the MoR |
| **Who is the seller** | You — you'll issue invoices and handle GST once registered | The MoR sells to the customer and handles tax in every country; you're paid out |
| **Settles in** | INR, to your bank | Paid out from the MoR to your Indian bank |

Why not LemonSqueezy: it [doesn't support UPI](https://lemonsqueezy.nolt.io/830) or settle in
INR, and it's [being folded into Stripe Managed Payments](https://www.lemonsqueezy.com/blog/2026-update),
which is still in preview. Building on it now means building on something being replaced.

UPI Autopay suits this price: once you approve the mandate, charges up to ₹15,000 go
through with no further approval ([Razorpay](https://razorpay.com/upi-autopay/)), and people can
pause or cancel from their own UPI app.

### 13.4 Changes to the app

*Built 2026-09-11: per-user currency, profiles, the access check and write guard, trial UI,
landing, pricing and legal pages, export and account deletion. Not built: payment providers,
checkout and webhooks.*

**Currency for global users — built 2026-09-11.** Each user picks one currency at signup
(pre-selected from their country) and can change it in Settings, with no conversion. Formatting,
field labels and the short forms (K/M instead of L/Cr) follow it; eight two-decimal currencies.
Still to do: dates are formatted Indian-style for everyone, and "UPI wallet" should read "Wallet"
outside India.

**New data**
- `profiles` — **exists** (name, currency). Still to add: billing country and a
  *complimentary* flag.
- `subscriptions` — provider, the provider's ids, status (trialing · active · past due ·
  cancelled · expired), monthly or yearly, currency, trial end, current period end, and
  cancel-at-period-end.
- `billing_events` — every webhook received, keyed by event id, so a repeated webhook is
  never applied twice.
- All three get Row Level Security, added to `drizzle/rls.sql`.

**Access rules**
- One server-side check decides access: **trial**, **active**, **grace** (a few days after a
  failed payment), or **read-only**.
- Every action that writes data checks it, not just the screens, since a request can skip the UI.
- Trial and grace expire when read, which fits "no scheduler" (principle 7).
- **Webhooks are the source of truth** for payment state, verified by signature. Returning from
  checkout only shows a "confirming…" state until the webhook lands.

**New screens**
- **Landing page** at `/` for signed-out visitors; signed in, `/` stays Home.
- **Pricing** at `/pricing`, showing ₹ or $ by location, with a switch.
- **Billing** in Settings — plan, next charge, switch monthly/yearly, cancel, invoices.
- **Trial banner** — days left, and a clear notice on entering read-only.
- **Legal** — privacy policy, terms, refund policy, contact. Payment gateways review these
  during onboarding.
- **Export** — all your data as CSV/JSON. **Delete account** — cancels the subscription first,
  then removes everything.
- Middleware allows signed-out access to `/`, `/pricing`, `/legal/*` and the webhook routes.

**Emails — Decide.** Trial-ending reminders need a transactional email service and a scheduled
job (Vercel Cron), both new here. Version 1 can use in-app banners only.

### 13.5 Before charging real money — checklist

Not legal or tax advice. The items marked **CA** need a chartered accountant.

- [ ] **Razorpay account and KYC** — PAN, Aadhaar, a bank account in your name, and a declaration
      that you're not GST-registered. Names must match exactly across all of them
      ([Razorpay KYC guide](https://razorpay.com/blog/payment-gateway-kyc-onboarding-india/),
      [without GST](https://thedigitox.com/razorpay-without-gst-number/)). Test mode works
      straight away.
- [ ] **Merchant of Record account** — confirm it accepts an individual Indian seller and pays out
      to India.
- [ ] **CA: do global sales force GST registration?** The domestic services threshold is
      ₹20 lakh ([ClearTax](https://cleartax.in/s/gst-registration-limits-increased)). Sources
      disagree on whether exporting services through an MoR requires registration below it
      ([one view](https://www.cagpt.in/goods-and-service-tax/gst-registration-mandatory-persons-making-export-services)),
      and on the conditions for zero-rating
      ([Razorpay](https://razorpay.com/blog/conditions-for-export-of-services-under-gst/)).
- [ ] **CA: foreign-currency receipts** — the paperwork needed for payouts from the MoR.
- [ ] **Privacy** — a privacy policy under India's DPDP Act, plus deletion and export working.
- [ ] Live keys in Vercel's environment settings, then one real end-to-end purchase and refund on
      each provider.

### 13.6 Build order

Each phase ships on its own and leaves the app working.

| # | Phase | Needs from Pranjal |
|---|---|---|
| 0 | ~~Fix the gaps in §11~~ — **done 2026-09-11** | — |
| 1 | ~~Foundations~~ — **done 2026-09-11** | Approve the legal drafts; confirm prices |
| 2 | ~~Trial and access rules~~ — **done 2026-09-11**; enforcement off (`ACCESS_ENFORCED`) | — |
| 3 | **Razorpay, test mode** — plans, checkout, webhooks, billing settings | Razorpay account; test keys in `.env.local` |
| 4 | **Merchant of Record, test mode** — the same for global users | Pick the MoR; its test keys |
| 5 | **Go live** | The §13.5 checklist |

### 13.7 Risks

- **No free tier, so fewer signups.** The trial and read-only mode soften it. Watch trial-to-paid
  conversion from the first week.
- **Two payment systems means twice the edge cases** — failed payments, refunds, people moving
  country. One `subscriptions` table and one access check keep the app itself unaware of which
  provider it is.
- **Payment rules keep tightening in India** — RBI's 2025 directions made KYC stricter and added
  ongoing re-checks.
- **Merchant of Record comparisons are often written by the vendors themselves** (Dodo's own
  blog recommends Dodo). Check the fees and the individual-seller policy on each provider's own
  pricing page before choosing.

### 13.8 Sources

- Lemon Squeezy — [UPI request](https://lemonsqueezy.nolt.io/830) ·
  [2026 update](https://www.lemonsqueezy.com/blog/2026-update)
- India alternatives — [Playto](https://www.playto.so/blogs/lemon-squeezy-alternative-india) ·
  [ownstreet](https://ownstreet.in/blog/lemon-squeezy-alternative-india-2026-guide) ·
  [Dodo Payments](https://dodopayments.com/blogs/top-merchant-of-record-for-saas-india)
- Razorpay — [UPI Autopay](https://razorpay.com/upi-autopay/) ·
  [Subscriptions](https://razorpay.com/subscriptions/) ·
  [KYC](https://razorpay.com/blog/payment-gateway-kyc-onboarding-india/)
- GST — [ClearTax thresholds](https://cleartax.in/s/gst-registration-limits-increased) ·
  [export conditions](https://razorpay.com/blog/conditions-for-export-of-services-under-gst/)
