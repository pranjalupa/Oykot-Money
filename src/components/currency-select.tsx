import { CURRENCIES, CURRENCY_CODES, type CurrencyCode } from "@/lib/currency";
import { cn } from "@/lib/utils";

/** Native select on purpose: eight options, and the platform picker is the most usable one on a phone. */
export function CurrencySelect({
  className,
  defaultValue,
  ...props
}: Omit<React.ComponentProps<"select">, "defaultValue"> & {
  defaultValue?: CurrencyCode;
}) {
  return (
    <select
      name="currency"
      defaultValue={defaultValue}
      className={cn(
        "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
      {...props}
    >
      {CURRENCY_CODES.map((code) => (
        <option key={code} value={code}>
          {CURRENCIES[code].name} ({CURRENCIES[code].symbol})
        </option>
      ))}
    </select>
  );
}
