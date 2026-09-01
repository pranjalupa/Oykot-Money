import type { GroupKey } from "@/db/schema";

/** What a brand-new account starts with, before anyone tunes it. */
export const DEFAULT_TARGETS: Record<Exclude<GroupKey, "income">, number> = {
  needs: 50,
  wants: 30,
  investments: 20,
};

export const GROUP_META: Record<
  GroupKey,
  { label: string; blurb: string; slug: string }
> = {
  needs: {
    label: "Needs",
    blurb: "Rent, food, transport — the non-negotiables.",
    slug: "needs",
  },
  wants: {
    label: "Wants",
    blurb: "Eating out, clothes, subscriptions.",
    slug: "wants",
  },
  investments: {
    label: "Investments",
    blurb: "SIP, PF, emergency fund — money you keep.",
    slug: "investments",
  },
  income: {
    label: "Income",
    blurb: "Salary, freelance, everything coming in.",
    slug: "income",
  },
};

export const SPEND_GROUPS = ["needs", "wants", "investments"] as const;

/* ---------------------------------------------------------------------- */
/* Date helpers — months are "YYYY-MM", days are "YYYY-MM-DD"              */
/* ---------------------------------------------------------------------- */

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function isValidMonth(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}$/.test(v);
}

export function isValidDate(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
