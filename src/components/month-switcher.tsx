import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { IconLink } from "@/components/icon-link";
import { monthLabel, shiftMonth } from "@/lib/targets";
import { currentMonthIn } from "@/lib/dates";
import { getUserPrefs } from "@/lib/auth";

/**
 * `basePath` may already carry a query — the home page passes `/?view=daily` —
 * so the separator has to be chosen, not assumed.
 */
function withMonth(basePath: string, month: string) {
  return `${basePath}${basePath.includes("?") ? "&" : "?"}month=${month}`;
}

export async function MonthSwitcher({
  month,
  basePath = "/",
}: {
  month: string;
  basePath?: string;
}) {
  const { timeZone } = await getUserPrefs();
  const thisMonth = currentMonthIn(timeZone);
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <div className="flex items-center gap-1">
      <IconLink href={withMonth(basePath, prev)} label={`Go to ${monthLabel(prev)}`}>
        <CaretLeft size={16} weight="bold" />
      </IconLink>

      <span className="min-w-[9.5rem] text-center text-sm font-medium">
        {monthLabel(month)}
      </span>

      <IconLink href={withMonth(basePath, next)} label={`Go to ${monthLabel(next)}`}>
        <CaretRight size={16} weight="bold" />
      </IconLink>

      {month !== thisMonth && (
        <Link
          href={withMonth(basePath, thisMonth)}
          className="ml-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Today
        </Link>
      )}
    </div>
  );
}
