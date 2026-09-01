import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { currentMonth, monthLabel, shiftMonth } from "@/lib/budget";

export function MonthSwitcher({
  month,
  basePath = "/",
}: {
  month: string;
  basePath?: string;
}) {
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const isCurrent = month === currentMonth();

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`${basePath}?month=${prev}`}
        aria-label={`Go to ${monthLabel(prev)}`}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <CaretLeft size={16} weight="bold" />
      </Link>

      <span className="min-w-[9.5rem] text-center text-sm font-medium">
        {monthLabel(month)}
      </span>

      <Link
        href={`${basePath}?month=${next}`}
        aria-label={`Go to ${monthLabel(next)}`}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <CaretRight size={16} weight="bold" />
      </Link>

      {!isCurrent && (
        <Link
          href={basePath}
          className="ml-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Today
        </Link>
      )}
    </div>
  );
}
