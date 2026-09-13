/**
 * First-use guides: one short card per major flow, shown until you press
 * "Got it". Dismissals are stored on the profile (`dismissed_guides`), so they
 * follow you across devices; Settings → "Show tips again" clears them.
 *
 * Keep each to three steps. A guide that needs more is a flow that needs fixing.
 */
export const GUIDES = {
  "home-daily": {
    title: "How Daily works",
    steps: [
      "Safe to spend is what's left in Needs and Wants, divided by the days left in the month.",
      "Tap Add (or + on your phone) whenever money moves — Spent, Received, or Lend / Borrow.",
      "Spending pace shows your spending against an even pace. Under the dashed line means on track.",
    ],
  },
  "home-month": {
    title: "Planning your month",
    steps: [
      "Set what you plan to spend per category on the Needs, Wants and Investments pages.",
      "Your income split compares where money went with your target split. Adjust split changes it.",
      "Next month starts with this month's plan, so you only set it once.",
    ],
  },
  "home-year": {
    title: "Your year",
    steps: [
      "Saved each month is income minus everything spent.",
      "Tap a month in Month by month to open it.",
    ],
  },
  group: {
    title: "Budgeting a group",
    steps: [
      "Click an amount with the pencil to set this month's budget for that category.",
      "Tap a row to see its transactions and six-month trend.",
      "Categories with nothing planned or spent are tucked behind Show untouched.",
    ],
  },
  money: {
    title: "Your money",
    steps: [
      "Accounts are where your money sits. Move money shifts it between them without touching your budget.",
      "Assets like SIP or PF are a value you update whenever you check them.",
      "Net worth adds it all up, plus what you'll get, minus what you'll give.",
    ],
  },
  settlements: {
    title: "Lending and borrowing",
    steps: [
      "Add a person or a lender, then tap them.",
      "Use You gave or You got. It counts in this month's budget on its own — as Lent out, Paid back, Borrowed or Got paid back.",
      "Settle up fills in the whole balance for you.",
    ],
  },
  add: {
    title: "Adding a transaction",
    steps: [
      "Spent and Received need a category, so they count in your budget.",
      "Lend / Borrow is for money with a person or a bank — pick who, and whether you gave or got.",
      "Tick Repeat every month for rent, SIP or salary.",
    ],
  },
  categories: {
    title: "Managing categories",
    steps: [
      "Drag to reorder. The pencil renames a category or moves it to another group.",
      "Retire hides a category but keeps its history; delete removes the label.",
      "The four locked categories are used by Lend / Borrow and can only be budgeted.",
    ],
  },
} as const satisfies Record<string, { title: string; steps: readonly string[] }>;

export type GuideId = keyof typeof GUIDES;
export const GUIDE_IDS = Object.keys(GUIDES) as GuideId[];
export const isGuideId = (v: unknown): v is GuideId => typeof v === "string" && v in GUIDES;
