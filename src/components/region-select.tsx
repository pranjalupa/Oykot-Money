import { REGIONS, REGION_CODES, type RegionCode } from "@/lib/region";
import { formatDay } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Each option shows today's date in that format, so the choice explains itself. */
export function RegionSelect({
  className,
  defaultValue,
  ...props
}: Omit<React.ComponentProps<"select">, "defaultValue"> & {
  defaultValue?: RegionCode;
}) {
  return (
    <select
      name="region"
      defaultValue={defaultValue}
      className={cn(
        "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
      {...props}
    >
      {REGION_CODES.map((code) => (
        <option key={code} value={code}>
          {REGIONS[code].label} — {formatDay("2026-09-03", REGIONS[code].locale, { day: "numeric", month: "short", year: "numeric" })}
        </option>
      ))}
    </select>
  );
}
