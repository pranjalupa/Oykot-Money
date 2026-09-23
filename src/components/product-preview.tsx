import { CountUp } from "@/components/landing-motion";

/**
 * Slices of the real app, built from the same tokens the app uses, for the
 * places where we're selling it: the landing page, and the panel beside the
 * sign-in form.
 *
 * Deliberately markup rather than screenshots. A screenshot goes stale the day
 * a screen changes, can't answer to light and dark, and is a blurry PNG on a
 * retina display. These follow the theme for free.
 */

/** Daily's hero: the question the app exists to answer. */
export function DailyPreviewCard({ className }: { className?: string }) {
  const spent = 44_388;
  const budget = 61_500;

  return (
    <div className={`rounded-[1.75rem] border border-border bg-card p-5 shadow-xl ${className ?? ""}`}>
      <p className="text-sm font-medium text-muted-foreground">Safe to spend today</p>
      <p className="mt-1.5 font-heading text-[2.75rem] leading-none font-bold tracking-tight">
        ₹<CountUp value={1711} />
        <span className="ml-1.5 font-sans text-base font-medium tracking-normal text-muted-foreground">
          / day
        </span>
      </p>

      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="fill-bar h-full rounded-full bg-primary"
          style={{ width: `${Math.round((spent / budget) * 100)}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">₹44,388</span> of ₹61,500 spent
        <span aria-hidden className="mx-1.5">·</span>
        <span className="font-semibold text-foreground">₹17,112</span> left
      </p>
    </div>
  );
}

/** The shell every mini sits in: inset, clipped, and never interactive. */
function Mini({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-xl border border-border bg-background/60 p-3 select-none"
    >
      {children}
    </div>
  );
}

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border py-2 text-[13px] last:border-b-0">
    {children}
  </div>
);

/** Category rows with their planned amounts — what Monthly looks like. */
export function BudgetMini() {
  const rows = [
    { name: "Groceries", spent: "₹3,999", left: "₹5,001" },
    { name: "Transport", spent: "₹2,110", left: "₹1,390" },
    { name: "Rent", spent: "₹22,000", left: "₹0" },
  ];
  return (
    <Mini>
      {rows.map((r) => (
        <Row key={r.name}>
          <span className="truncate font-medium">{r.name}</span>
          <span className="shrink-0 text-muted-foreground">
            {r.spent} spent · <span className="font-semibold text-foreground">{r.left}</span> left
          </span>
        </Row>
      ))}
    </Mini>
  );
}

/** Who owes whom, in words rather than signs. */
export function PeopleMini() {
  return (
    <Mini>
      <Row>
        <span className="font-medium">Rahul</span>
        <span className="font-semibold text-positive">You&rsquo;ll get ₹2,000</span>
      </Row>
      <Row>
        <span className="font-medium">Aman</span>
        <span className="text-muted-foreground">Settled</span>
      </Row>
      <Row>
        <span className="font-medium">Home loan</span>
        <span className="font-semibold text-negative">You&rsquo;ll give ₹18,400</span>
      </Row>
    </Mini>
  );
}

/** The bills that log themselves. */
export function RecurringMini() {
  const rows = [
    { name: "Rent", when: "1st, every month", amount: "₹22,000" },
    { name: "Index fund SIP", when: "5th, every month", amount: "₹10,000" },
    { name: "Netflix", when: "12th, every month", amount: "₹649" },
  ];
  return (
    <Mini>
      {rows.map((r) => (
        <Row key={r.name}>
          <span className="min-w-0">
            <span className="block truncate font-medium">{r.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{r.when}</span>
          </span>
          <span className="shrink-0 font-semibold">{r.amount}</span>
        </Row>
      ))}
    </Mini>
  );
}

/** Spending against an even pace — Daily's one chart, drawn as plain divs. */
export function PaceMini() {
  // Heights as percentages: a month that starts steady and picks up.
  const bars = [38, 52, 44, 61, 48, 72, 66];
  return (
    <Mini>
      <div className="flex h-[76px] items-end gap-1.5">
        {bars.map((h, i) => (
          <span
            key={i}
            className={`flex-1 rounded-sm ${i === bars.length - 1 ? "bg-primary" : "bg-primary/35"}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Mon → Sun · under the line all week</p>
    </Mini>
  );
}

/** The month's split, as three stacked proportions — Monthly, in miniature. */
export function SplitPreviewCard({ className }: { className?: string }) {
  const rows = [
    { name: "Needs", amount: "₹33,002", pct: 54, tint: "var(--chart-needs)" },
    { name: "Wants", amount: "₹11,386", pct: 19, tint: "var(--chart-wants)" },
    { name: "Investments", amount: "₹16,000", pct: 27, tint: "var(--chart-investments)" },
  ];

  return (
    <div className={`rounded-2xl border border-border bg-card p-4 shadow-xl ${className ?? ""}`}>
      <p className="text-xs font-medium text-muted-foreground">Where September went</p>

      {/* One bar, three parts — the split as a single line. */}
      <div className="mt-3 flex h-2.5 gap-1 overflow-hidden rounded-full">
        {rows.map((r) => (
          <span key={r.name} style={{ width: `${r.pct}%`, background: r.tint }} className="rounded-full" />
        ))}
      </div>

      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center gap-2 text-xs">
            <span className="size-2 shrink-0 rounded-full" style={{ background: r.tint }} />
            <span className="font-medium">{r.name}</span>
            <span className="ml-auto text-muted-foreground">{r.amount}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
