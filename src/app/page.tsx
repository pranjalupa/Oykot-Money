import Link from "next/link";
import { after } from "next/server";
import { currentMonthIn, todayIn } from "@/lib/dates";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { IconLink } from "@/components/icon-link";
import { MonthSwitcher } from "@/components/month-switcher";
import { TransactionDialog } from "@/components/transaction-dialog";
import { DailyView } from "@/components/views/daily-view";
import { MonthView } from "@/components/views/month-view";
import { YearView } from "@/components/views/year-view";
import {
  isValidMonth,
  listAccounts,
  recordNetWorth,
  listCategories,
  monthLabel,
} from "@/lib/budget";
import { redirect } from "next/navigation";
import { getUser, ensureUserSetup, getProfile, getUserPrefs } from "@/lib/auth";
import { FlowGuide } from "@/components/flow-guide";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const VIEWS = ["daily", "month", "year"] as const;
type View = (typeof VIEWS)[number];

const TAB_LABEL: Record<View, string> = {
  daily: "Daily",
  month: "Monthly",
  year: "Yearly",
};

/**
 * One home, three time horizons.
 *
 * The view lives in the URL rather than in client state so each tab stays a
 * server render with no data fetching in the browser, and a tab you're looking
 * at is a link you can share or reload. Daily is the default because it's the
 * one that answers "can I spend this?", which is the daily question.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; year?: string; add?: string }>;
}) {
  const user = await getUser();
  // No marketing page for now: signed out, "/" is the sign-in screen.
  if (!user) redirect("/login");
  const { timeZone } = await getUserPrefs();
  // Home is the page people open most, so it keeps net worth history filled
  // in — after the response, so it never slows the page down.
  after(() =>
    recordNetWorth(user.id, currentMonthIn(timeZone)).catch((e) =>
      console.error("net worth snapshot failed", e),
    ),
  );
  await ensureUserSetup(user.id);
  // A new account sets itself up first (skippable) — see app/welcome.
  if (!(await getProfile())?.onboardedAt) redirect("/welcome");

  const params = await searchParams;
  const view: View = (VIEWS as readonly string[]).includes(params.view ?? "")
    ? (params.view as View)
    : "daily";

  const month = isValidMonth(params.month) ? params.month : currentMonthIn(timeZone);

  const parsedYear = Number(params.year);
  const year =
    Number.isInteger(parsedYear) && parsedYear > 2000 && parsedYear < 2200
      ? parsedYear
      : Number(month.slice(0, 4));

  const [accounts, categories] = await Promise.all([
    listAccounts(user.id),
    listCategories(user.id),
  ]);

  // Each tab keeps the period you were looking at, so switching Daily → Monthly
  // doesn't silently throw you back to today.
  const href = (v: View) =>
    v === "year"
      ? `/?view=year&year=${year}`
      : `/?view=${v}&month=${month}&year=${year}`;

  return (
    <div className="flex flex-col gap-6">
      {/* On a phone the period already reads as the heading, so the title and
          its sentence are desktop-only — four rows of chrome above one number
          was the whole complaint. */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="hidden sm:block">
          <h1 className="font-heading text-2xl font-bold">
            {view === "year" ? year : monthLabel(month)}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {view === "daily" && "Day by day, and what's safe to spend from here."}
            {view === "month" && "What you planned, next to what you actually spent."}
            {view === "year" && "Month by month, across the whole year."}
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          {view === "year" ? (
            <YearSwitcher year={year} />
          ) : (
            <MonthSwitcher month={month} basePath={`/?view=${view}`} />
          )}
          {/* The phone tab bar's "+" lands on /?add=1. Keyed so arriving there
              while already on Home remounts it open. */}
          <div className="contents max-sm:hidden">
          <TransactionDialog
            key={params.add === "1" ? "add" : "idle"}
            defaultOpen={params.add === "1"}
            accounts={accounts}
            categories={categories}
            defaultDate={todayIn(timeZone)}
          />
          </div>
        </div>
      </header>

      <nav
        aria-label="Time range"
        className="flex gap-1 rounded-lg bg-muted p-1"
      >
        {VIEWS.map((v) => (
          <Link
            key={v}
            href={href(v)}
            aria-current={v === view ? "page" : undefined}
            className={cn(
              "flex h-11 flex-1 items-center justify-center rounded-md px-3 text-center text-[15px] font-medium transition-colors sm:h-8 sm:text-sm",
              v === view
                ? // bg-card is *darker* than bg-muted in dark mode, so elevation
                  // alone doesn't read there — the ring is what makes the active
                  // tab visible in both themes.
                  "bg-card text-foreground ring-1 ring-foreground/15"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {TAB_LABEL[v]}
          </Link>
        ))}
      </nav>

      <FlowGuide id={view === "daily" ? "home-daily" : view === "month" ? "home-month" : "home-year"} />

      {view === "daily" && <DailyView month={month} />}
      {view === "month" && <MonthView month={month} />}
      {view === "year" && <YearView year={year} />}
    </div>
  );
}

function YearSwitcher({ year }: { year: number }) {
  return (
    <div className="flex w-full items-center justify-between gap-1 sm:w-auto sm:justify-start">
      <IconLink href={`/?view=year&year=${year - 1}`} label={`Go to ${year - 1}`}>
        <CaretLeft size={16} weight="bold" />
      </IconLink>
      <span className="tabular flex-1 text-center text-base font-semibold sm:min-w-14 sm:flex-none sm:text-sm sm:font-medium">
        {year}
      </span>
      <IconLink href={`/?view=year&year=${year + 1}`} label={`Go to ${year + 1}`}>
        <CaretRight size={16} weight="bold" />
      </IconLink>
    </div>
  );
}
