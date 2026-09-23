import {
  BatteryFull,
  CellSignalFull,
  ChartPieSlice,
  Coffee,
  ForkKnife,
  GearSix,
  Handshake,
  House,
  Plus,
  ShoppingBag,
  SquaresFour,
  Train,
  Wallet,
  WifiHigh,
} from "@phosphor-icons/react/dist/ssr";
import { LogoMark } from "@/components/logo";
import type { PriceCurrency } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * Device mockups for the marketing pages: a phone, the app's Daily screen
 * inside it, and the floating cards that sit around it.
 *
 * All markup, no images — they follow light and dark, stay sharp, and change
 * when the app does. Plain components (no "use client", SSR icon build) so the
 * animated hero and the static uses on the landing, pricing and sign-in pages
 * share one source. Everything here is decoration: callers put `aria-hidden`
 * on the composition and describe it in words once.
 */

export type MockRow = {
  name: string;
  category: string;
  amount: number;
  icon: "train" | "food" | "coffee" | "shop";
};

const ROW_ICON = { train: Train, food: ForkKnife, coffee: Coffee, shop: ShoppingBag };

export function mockMoney(n: number, currency: PriceCurrency) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Sample figures per currency, so an Indian visitor sees rupees that make sense. */
export const SAMPLE: Record<
  PriceCurrency,
  { daily: number; spent: number; budget: number; income: number; existing: MockRow; logged: MockRow }
> = {
  INR: {
    daily: 1850,
    spent: 38_400,
    budget: 61_500,
    income: 80_000,
    existing: { name: "Metro", category: "Transport", amount: 60, icon: "train" },
    logged: { name: "Lunch", category: "Food", amount: 240, icon: "food" },
  },
  USD: {
    daily: 57,
    spent: 1_180,
    budget: 1_900,
    income: 4_000,
    existing: { name: "Coffee", category: "Food", amount: 5, icon: "coffee" },
    logged: { name: "Lunch", category: "Food", amount: 14, icon: "food" },
  },
};

/* -------------------------------------------------------------------------- */

/**
 * A phone: a near-black bezel, rounded screen, dynamic island, status bar and
 * home indicator. The frame keeps its colour in both themes (phones are dark
 * glass); the screen follows the theme like the app does.
 */
export function PhoneFrame({
  children,
  className,
  screenClassName,
}: {
  children: React.ReactNode;
  className?: string;
  screenClassName?: string;
}) {
  return (
    <div
      className={cn(
        "lp-phone-shadow relative w-[288px] shrink-0 rounded-[3rem] bg-[#161615] p-[9px] ring-1 ring-black/20",
        className,
      )}
    >
      {/* Side buttons, so it reads as a device and not a rounded box. */}
      <span className="absolute top-28 -left-[3px] h-8 w-[3px] rounded-l bg-[#161615]" />
      <span className="absolute top-40 -left-[3px] h-14 w-[3px] rounded-l bg-[#161615]" />
      <span className="absolute top-36 -right-[3px] h-20 w-[3px] rounded-r bg-[#161615]" />
      <div
        className={cn(
          "relative h-[590px] overflow-hidden rounded-[2.45rem] bg-background text-foreground",
          screenClassName,
        )}
      >
        <div className="absolute top-2.5 left-1/2 z-20 h-[25px] w-[88px] -translate-x-1/2 rounded-full bg-[#161615]" />
        <div className="relative z-10 flex h-11 items-center justify-between px-7 pt-1 text-[12px] font-semibold">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <CellSignalFull size={13} weight="fill" />
            <WifiHigh size={13} weight="bold" />
            <BatteryFull size={17} weight="fill" />
          </span>
        </div>
        {children}
        <div className="absolute bottom-1.5 left-1/2 z-20 h-1 w-24 -translate-x-1/2 rounded-full bg-foreground/80" />
      </div>
    </div>
  );
}

/** The phone tab bar, as the app draws it: Home, Groups, Add, Money, Settings. */
function TabBar() {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex h-[70px] items-start justify-around border-t border-border bg-card px-3 pt-2.5">
      <House size={20} weight="fill" />
      <SquaresFour size={20} className="text-muted-foreground" />
      <span className="-mt-0.5 grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
        <Plus size={16} weight="bold" />
      </span>
      <Wallet size={20} className="text-muted-foreground" />
      <GearSix size={20} className="text-muted-foreground" />
    </div>
  );
}

export function MockRowView({
  row,
  currency,
  className,
}: {
  row: MockRow;
  currency: PriceCurrency;
  className?: string;
}) {
  const Icon = ROW_ICON[row.icon];
  return (
    <div className={cn("-mx-1.5 flex items-center gap-2.5 rounded-xl px-1.5 py-1.5", className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted">
        <Icon size={14} weight="duotone" />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[12.5px] font-medium">{row.name}</span>
        <span className="block text-[10.5px] text-muted-foreground">{row.category}</span>
      </span>
      <span className="text-[12.5px] font-semibold tabular-nums">−{mockMoney(row.amount, currency)}</span>
    </div>
  );
}

/**
 * The Daily screen. Static by default; the hero passes live values (the
 * number mid-count, the new row appearing) through the same props, so there's
 * one drawing of this screen, not two that drift apart.
 */
export function DailyScreen({
  currency,
  amount,
  spent,
  pressed = false,
  newRow,
  logged = false,
}: {
  currency: PriceCurrency;
  amount?: number;
  spent?: number;
  /**
   * The finished state: the lunch is in Today and the figures include it.
   * One switch, so a static phone can't show the after-lunch number without
   * the lunch that caused it.
   */
  logged?: boolean;
  /** The Add tile, mid-tap. */
  pressed?: boolean;
  /** A row above today's others — the hero's just-logged lunch. */
  newRow?: React.ReactNode;
}) {
  const s = SAMPLE[currency];
  const shownSpent = spent ?? s.spent + (logged ? s.logged.amount : 0);
  const shownAmount = amount ?? s.daily - (logged ? s.logged.amount : 0);
  const actions = [
    { label: "Add", icon: Plus },
    { label: "Budget", icon: ChartPieSlice },
    { label: "Settle", icon: Handshake },
    { label: "Money", icon: Wallet },
  ];

  return (
    <>
      <div className="px-4">
        <div className="mt-1 flex items-center justify-between">
          <div className="leading-tight">
            <p className="text-[11px] text-muted-foreground">Thursday, 24 Sep</p>
            <p className="font-heading text-[19px] font-bold tracking-tight">Today</p>
          </div>
          <LogoMark size={26} />
        </div>

        <div className="mt-3 flex rounded-full bg-muted p-0.5 text-[11px] font-medium">
          <span className="flex-1 rounded-full bg-card py-1 text-center shadow-sm">Daily</span>
          <span className="flex-1 py-1 text-center text-muted-foreground">Monthly</span>
          <span className="flex-1 py-1 text-center text-muted-foreground">Yearly</span>
        </div>

        <div className="mt-3 rounded-2xl border border-border bg-card p-3.5">
          <p className="text-[11px] font-medium text-muted-foreground">Safe to spend today</p>
          <p className="mt-0.5 font-heading text-[2.05rem] leading-none font-bold tracking-tight tabular-nums">
            {mockMoney(shownAmount, currency)}
            <span className="ml-1 font-sans text-[11px] font-medium tracking-normal text-muted-foreground">
              / day
            </span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
              style={{ width: `${(shownSpent / s.budget) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[10.5px] text-muted-foreground tabular-nums">
            <span className="font-semibold text-foreground">{mockMoney(shownSpent, currency)}</span> of{" "}
            {mockMoney(s.budget, currency)} spent
          </p>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {actions.map(({ label, icon: Icon }, i) => (
            <span
              key={label}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-2 transition-transform duration-150",
                i === 0 && pressed && "scale-90",
              )}
            >
              <span className="grid size-7 place-items-center rounded-full bg-muted">
                <Icon size={13} weight={i === 0 ? "bold" : "regular"} />
              </span>
              <span className="text-[9.5px] font-medium">{label}</span>
            </span>
          ))}
        </div>

        <p className="mt-4 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Today</p>
        <div className="mt-1">
          {newRow ?? (logged && <MockRowView row={s.logged} currency={currency} />)}
          <MockRowView row={s.existing} currency={currency} />
        </div>
      </div>
      <TabBar />
    </>
  );
}

/* -------------------------------------------------------------------------- */

/** A card that floats beside a device. */
export function FloatCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("lp-float-shadow rounded-2xl border border-border bg-card p-3.5", className)}>
      {children}
    </div>
  );
}

/** The month's 50/30/20, used and remaining — Monthly, in a card. */
export function SplitCard({ className }: { className?: string }) {
  const groups = [
    { name: "Needs", used: 82, color: "var(--chart-needs)" },
    { name: "Wants", used: 64, color: "var(--chart-wants)" },
    { name: "Investments", used: 100, color: "var(--chart-investments)" },
  ];
  return (
    <FloatCard className={cn("w-[210px]", className)}>
      <p className="text-[11px] font-semibold">This month</p>
      <div className="mt-2.5 space-y-2">
        {groups.map((g) => (
          <div key={g.name}>
            <div className="flex justify-between text-[10.5px]">
              <span>{g.name}</span>
              <span className="text-muted-foreground tabular-nums">{g.used}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div data-lp-bar className="h-full rounded-full" style={{ width: `${g.used}%`, background: g.color }} />
            </div>
          </div>
        ))}
      </div>
    </FloatCard>
  );
}
