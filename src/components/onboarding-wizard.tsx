"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  ChartPieSlice,
  Money as MoneyIcon,
  Plus,
  Trash,
  Wallet,
  Wrench,
} from "@phosphor-icons/react";
import { completeOnboarding, skipOnboarding, type OnboardingInput } from "@/app/onboarding-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryIcon } from "@/components/category-icon";
import { CurrencySymbol, useCurrency } from "@/components/currency-provider";
import { IconButton } from "@/components/icon-button";
import { formatMoney, toMajor, toMinor } from "@/lib/money";
import { cn } from "@/lib/utils";
import { LogoMark, Wordmark } from "@/components/logo";

type SpendGroup = "needs" | "wants" | "investments";
type AccountType = "bank" | "cash" | "wallet";

const GROUPS: { key: SpendGroup; label: string; blurb: string }[] = [
  { key: "needs", label: "Needs", blurb: "Rent, groceries, bills" },
  { key: "wants", label: "Wants", blurb: "Eating out, shopping, fun" },
  { key: "investments", label: "Investments", blurb: "Savings, SIP, emergency fund" },
];

const PRESETS: { label: string; hint: string; split: Record<SpendGroup, number> }[] = [
  { label: "50 / 30 / 20", hint: "The classic", split: { needs: 50, wants: 30, investments: 20 } },
  { label: "60 / 20 / 20", hint: "Higher fixed costs", split: { needs: 60, wants: 20, investments: 20 } },
  { label: "50 / 20 / 30", hint: "Saving harder", split: { needs: 50, wants: 20, investments: 30 } },
];

const STEPS = [
  { title: "Your accounts", icon: Wallet },
  { title: "Your income", icon: MoneyIcon },
  { title: "Your split", icon: ChartPieSlice },
  { title: "Your budget", icon: Wrench },
] as const;

const SELECT =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

const num = (s: string) => {
  const n = Number(s.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
/** Suggestions round to the nearest 100 — nobody budgets ₹3,333.33. */
const round100 = (n: number) => Math.round(n / 100) * 100;

type AccountRow = { key: string; id?: string; name: string; type: AccountType; balance: string };
type BudgetRow = { keep: boolean; amount: string };

/**
 * First run: accounts and balances → monthly income → target split → this
 * month's budget, suggested from the income and split. Four steps, each one
 * screen, nothing required beyond a named account. Saved in one go at the end.
 */
export function OnboardingWizard({
  name,
  accounts,
  incomeCategories,
  spendCategories,
  split: initialSplit,
}: {
  name: string | null;
  accounts: { id: string; name: string; subtype: string | null; balanceMinor: number }[];
  incomeCategories: { id: string; name: string }[];
  spendCategories: { id: string; name: string; icon: string | null; groupKey: SpendGroup }[];
  split: Record<SpendGroup, number>;
}) {
  const router = useRouter();
  const currency = useCurrency();
  const money = (major: number) => formatMoney(toMinor(major), { currency });
  const [pending, start] = useTransition();

  const [step, setStep] = useState(0);
  const [rows, setRows] = useState<AccountRow[]>(() =>
    (accounts.length ? accounts : [{ id: undefined, name: "Bank Account", subtype: "bank", balanceMinor: 0 }]).map((a, i) => ({
      key: a.id ?? `new-${i}`,
      id: a.id,
      name: a.name,
      type: a.subtype === "cash" || a.subtype === "wallet" ? a.subtype : "bank",
      balance: a.balanceMinor ? String(toMajor(a.balanceMinor)) : "",
    })),
  );
  const [income, setIncome] = useState("");
  const [incomeCategoryId, setIncomeCategoryId] = useState(incomeCategories[0]?.id ?? "");
  const [split, setSplit] = useState(initialSplit);
  const [budget, setBudget] = useState<Record<string, BudgetRow>>(() =>
    Object.fromEntries(spendCategories.map((c) => [c.id, { keep: true, amount: "" }])),
  );
  const [budgetTouched, setBudgetTouched] = useState(false);

  const incomeMajor = num(income);
  const splitTotal = split.needs + split.wants + split.investments;
  const groupTarget = (g: SpendGroup) => (incomeMajor * split[g]) / 100;

  function suggest(from: Record<string, BudgetRow> = budget) {
    const next = { ...from };
    for (const g of GROUPS) {
      const kept = spendCategories.filter((c) => c.groupKey === g.key && next[c.id].keep);
      const each = kept.length ? round100(groupTarget(g.key) / kept.length) : 0;
      for (const c of kept) next[c.id] = { ...next[c.id], amount: each ? String(each) : "" };
    }
    setBudget(next);
  }

  const canNext =
    step === 1 ? rows.length > 0 && rows.every((r) => r.name.trim()) : step === 3 ? splitTotal === 100 : true;

  function next() {
    if (!canNext) return;
    // Arriving at the budget for the first time: fill it in from income and split.
    if (step === 3 && !budgetTouched) suggest();
    setStep((s) => s + 1);
    window.scrollTo({ top: 0 });
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0 });
  }

  function skip() {
    start(async () => {
      await skipOnboarding();
      router.replace("/");
    });
  }

  function finish() {
    const input: OnboardingInput = {
      accounts: rows.map((r) => ({ id: r.id, name: r.name, type: r.type, balance: num(r.balance) })),
      income: incomeMajor,
      incomeCategoryId: incomeMajor > 0 ? incomeCategoryId || null : null,
      split,
      budgets: spendCategories.map((c) => ({
        categoryId: c.id,
        keep: budget[c.id].keep,
        amount: num(budget[c.id].amount),
      })),
    };
    start(async () => {
      const res = await completeOnboarding(input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("You're all set");
      router.replace("/");
    });
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-5 py-8 sm:py-12">
        <header className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LogoMark size={26} />
            <Wordmark height={16} />
          </div>
          {step > 0 && (
            <button
              type="button"
              onClick={skip}
              disabled={pending}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Skip setup
            </button>
          )}
        </header>

        {step > 0 && (
          <div className="mb-8">
            <p className="text-xs font-medium text-muted-foreground">
              Step {step} of {STEPS.length}
            </p>
            <div className="mt-2 grid grid-cols-4 gap-1.5" aria-hidden>
              {STEPS.map((s, i) => (
                <span key={s.title} className={cn("h-1.5 rounded-full", i < step ? "bg-primary" : "bg-muted")} />
              ))}
            </div>
            <h1 className="mt-5 font-heading text-2xl font-bold">{STEPS[step - 1].title}</h1>
          </div>
        )}

        <main className="flex-1">
          {step === 0 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="font-heading text-3xl font-bold">
                  Welcome{name ? `, ${name.split(" ")[0]}` : ""}
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Four quick steps and your budget is ready. About two minutes, and you can change all of it later.
                </p>
              </div>
              <ol className="flex flex-col gap-2">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <s.icon size={17} weight="duotone" />
                    </span>
                    <span className="text-sm font-medium">
                      {i + 1}. {s.title}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Where your money sits, and roughly what&rsquo;s in each today. Balances count from here.
              </p>
              <ul className="flex flex-col gap-3">
                {rows.map((r, i) => (
                  <li key={r.key} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-end">
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Label htmlFor={`acc-name-${r.key}`}>Name</Label>
                      <Input
                        id={`acc-name-${r.key}`}
                        value={r.name}
                        maxLength={60}
                        placeholder="SBI, HDFC, Cash…"
                        onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`acc-type-${r.key}`}>Type</Label>
                        <select
                          id={`acc-type-${r.key}`}
                          value={r.type}
                          onChange={(e) =>
                            setRows(rows.map((x, j) => (j === i ? { ...x, type: e.target.value as AccountType } : x)))
                          }
                          className={SELECT}
                        >
                          <option value="bank">Bank</option>
                          <option value="cash">Cash</option>
                          <option value="wallet">Wallet</option>
                        </select>
                      </div>
                      <div className="flex w-32 flex-col gap-1.5">
                        <Label htmlFor={`acc-bal-${r.key}`}>
                          Balance (<CurrencySymbol />)
                        </Label>
                        <Input
                          id={`acc-bal-${r.key}`}
                          inputMode="decimal"
                          placeholder="0"
                          value={r.balance}
                          onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, balance: e.target.value } : x)))}
                        />
                      </div>
                      <IconButton
                        label={`Remove ${r.name || "account"}`}
                        tone="danger"
                        disabled={rows.length === 1}
                        onClick={() => setRows(rows.filter((_, j) => j !== i))}
                        className="mt-auto"
                      >
                        <Trash size={14} weight="bold" />
                      </IconButton>
                    </div>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => setRows([...rows, { key: `new-${Date.now()}`, name: "", type: "bank", balance: "" }])}
              >
                <Plus size={14} weight="bold" />
                Add another account
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-muted-foreground">
                What usually comes in each month, after tax. It&rsquo;s used to suggest your budget — leave it empty if
                it varies a lot.
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="income">
                  Monthly income (<CurrencySymbol />)
                </Label>
                <Input
                  id="income"
                  inputMode="decimal"
                  autoFocus
                  placeholder="0"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className="h-12 text-lg font-semibold"
                />
              </div>
              {incomeCategories.length > 1 && incomeMajor > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="income-cat">Mostly from</Label>
                  <select
                    id="income-cat"
                    value={incomeCategoryId}
                    onChange={(e) => setIncomeCategoryId(e.target.value)}
                    className={SELECT}
                  >
                    {incomeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-muted-foreground">
                How you want to share your income between the three groups. It&rsquo;s a target to aim for, not a rule.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {PRESETS.map((p) => {
                  const active = GROUPS.every((g) => split[g.key] === p.split[g.key]);
                  return (
                    <button
                      key={p.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setSplit(p.split);
                        setBudgetTouched(false);
                      }}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition-colors",
                        active ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
                      )}
                    >
                      <span className="block font-heading font-bold tabular-nums">{p.label}</span>
                      <span className="block text-xs text-muted-foreground">{p.hint}</span>
                    </button>
                  );
                })}
              </div>
              <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
                {GROUPS.map((g) => (
                  <li key={g.key} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{g.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {g.blurb}
                        {incomeMajor > 0 && ` · ${money(groupTarget(g.key))}`}
                      </p>
                    </div>
                    <div className="relative w-20">
                      <Input
                        aria-label={`${g.label} percent`}
                        inputMode="numeric"
                        value={String(split[g.key])}
                        onChange={(e) => {
                          setSplit({ ...split, [g.key]: Math.min(100, Math.round(num(e.target.value))) });
                          setBudgetTouched(false);
                        }}
                        className="pr-7 text-right"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className={cn("text-sm", splitTotal === 100 ? "text-muted-foreground" : "font-medium text-negative")}>
                {splitTotal === 100 ? "Adds up to 100%." : `Adds up to ${splitTotal}% — it needs to be 100%.`}
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Untick what you don&rsquo;t need.{" "}
                  {incomeMajor > 0 ? "Amounts are suggested from your income and split." : "Add an amount for each."}
                </p>
                {incomeMajor > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      suggest();
                      setBudgetTouched(false);
                    }}
                  >
                    Suggest again
                  </Button>
                )}
              </div>

              {GROUPS.map((g) => {
                const inGroup = spendCategories.filter((c) => c.groupKey === g.key);
                if (!inGroup.length) return null;
                const planned = inGroup.reduce((s, c) => s + (budget[c.id].keep ? num(budget[c.id].amount) : 0), 0);
                const target = groupTarget(g.key);
                const over = incomeMajor > 0 && planned > target;
                return (
                  <section key={g.key} className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
                      <h2 className="font-heading font-bold">{g.label}</h2>
                      <p className={cn("text-xs tabular-nums", over ? "font-medium text-negative" : "text-muted-foreground")}>
                        {money(planned)}
                        {incomeMajor > 0 && ` of ${money(target)}`}
                      </p>
                    </div>
                    <ul className="divide-y divide-border">
                      {inGroup.map((c) => {
                        const row = budget[c.id];
                        return (
                          <li key={c.id} className={cn("flex items-center gap-3 px-4 py-2.5", !row.keep && "opacity-55")}>
                            <input
                              type="checkbox"
                              id={`keep-${c.id}`}
                              checked={row.keep}
                              onChange={(e) => {
                                setBudgetTouched(true);
                                setBudget({ ...budget, [c.id]: { ...row, keep: e.target.checked } });
                              }}
                              className="size-4 accent-primary"
                            />
                            <CategoryIcon name={c.icon} className="size-7 shrink-0 rounded-md bg-muted text-muted-foreground" />
                            <label htmlFor={`keep-${c.id}`} className="min-w-0 flex-1 truncate text-sm">
                              {c.name}
                            </label>
                            <Input
                              aria-label={`${c.name} budget`}
                              inputMode="decimal"
                              placeholder="0"
                              disabled={!row.keep}
                              value={row.amount}
                              onChange={(e) => {
                                setBudgetTouched(true);
                                setBudget({ ...budget, [c.id]: { ...row, amount: e.target.value } });
                              }}
                              className="h-8 w-28 text-right tabular-nums"
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
              <p className="text-xs text-muted-foreground">
                Unticked categories are retired, not deleted — bring them back any time from Settings.
              </p>
            </div>
          )}
        </main>

        <footer className="sticky bottom-0 mt-8 flex items-center gap-2 border-t border-border bg-background py-4">
          {step === 0 ? (
            <>
              <Button type="button" variant="ghost" onClick={skip} disabled={pending}>
                Skip for now
              </Button>
              <Button type="button" className="ml-auto" onClick={next}>
                Let&rsquo;s start
                <ArrowRight size={16} weight="bold" />
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={back} disabled={pending}>
                <ArrowLeft size={16} weight="bold" />
                Back
              </Button>
              {step < STEPS.length ? (
                <Button type="button" className="ml-auto" onClick={next} disabled={!canNext}>
                  Next
                  <ArrowRight size={16} weight="bold" />
                </Button>
              ) : (
                <Button type="button" className="ml-auto" onClick={finish} disabled={pending}>
                  {pending ? "Setting up…" : "Finish setup"}
                </Button>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
