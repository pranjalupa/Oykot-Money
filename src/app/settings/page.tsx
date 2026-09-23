import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { CategoryManager } from "@/components/category-manager";
import { FlowGuide, ResetGuidesButton } from "@/components/flow-guide";
import { RecurringList } from "@/components/recurring-list";
import {
  listCategories,
  listRecurring,
} from "@/lib/budget";
import { requireUser, getProfile, getUserPrefs } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { formatDay } from "@/lib/dates";
import { ProfileForm } from "@/components/profile-form";
import { BillingControls } from "@/components/billing-controls";
import { AccountData } from "@/components/account-data";
import { DEFAULT_CURRENCY, isCurrency } from "@/lib/currency";
import { DEFAULT_REGION, isRegion } from "@/lib/region";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  const [categories, recurring, profile] = await Promise.all([
    listCategories(user.id),
    listRecurring(user.id),
    getProfile(),
  ]);
  const [access, { locale }] = await Promise.all([getAccess(), getUserPrefs()]);
  const periodEnd = access?.periodEnd
    ? formatDay(access.periodEnd.toISOString(), locale, { day: "numeric", month: "long", year: "numeric" })
    : null;
  const lifetime = access?.state === "active" && access.plan === "lifetime";
  const planLabel =
    access?.state === "complimentary"
      ? "Complimentary. Free for good."
      : lifetime
        ? "Lifetime · founding member"
        : access?.state === "active" && access.cancelling
          ? `Cancelled · yours until ${periodEnd ?? "the end of this period"}`
          : access?.state === "active"
        ? `Paid · ${access.plan ?? "monthly"}${periodEnd ? `, renews ${periodEnd}` : ""}`
        : access?.state === "trial"
          ? `Free trial · ends ${formatDay(access.trialEndsAt.toISOString(), locale, { day: "numeric", month: "long" })}`
          : access?.state === "grace"
            ? "Payment problem. Update your payment to keep going."
            : "Trial ended";

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Signed in as {user.email}.
        </p>
        <div className="mt-2 text-muted-foreground">
          <ResetGuidesButton />
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">Profile</h2>
        <p className="mt-0.5 mb-4 text-sm text-muted-foreground">
          Your name, the currency your budget is counted in, and how dates read.
        </p>
        <ProfileForm
          name={profile?.displayName ?? ""}
          region={
            profile && isRegion(profile.region) ? profile.region : DEFAULT_REGION
          }
          currency={
            profile && isCurrency(profile.currency)
              ? profile.currency
              : DEFAULT_CURRENCY
          }
        />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">Billing</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{planLabel}</p>
        {access && access.state !== "complimentary" && access.state !== "active" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Payments aren&rsquo;t live yet, so there&rsquo;s nothing to pay. You keep full access
            until they are.
          </p>
        )}
        {access?.state === "active" && access.provider && !lifetime && !access.cancelling ? (
          <BillingControls provider={access.provider} periodEnd={periodEnd} />
        ) : (
          !lifetime &&
          access?.state !== "complimentary" && (
            <Link
              href="/pricing"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
            >
              See plans
              <ArrowSquareOut size={14} weight="bold" />
            </Link>
          )
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">Target split</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Set on the Monthly tab now, next to the budget it shapes.
        </p>
        <Link
          href="/?view=month"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
        >
          Open Monthly
          <ArrowSquareOut size={14} weight="bold" />
        </Link>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">Repeats every month</h2>
        <p className="mt-0.5 mb-4 text-sm text-muted-foreground">
          Added automatically when you open the month. Pausing stops future
          ones; removing a repeat leaves the transactions it already made.
        </p>
        <RecurringList rules={recurring} />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">Categories</h2>
        <p className="mt-0.5 mb-4 text-sm text-muted-foreground">
          Rename, re-group, or retire any of them. Retiring keeps past
          transactions intact. It just stops the category appearing in new ones.
        </p>
        <FlowGuide id="categories" className="mb-4" />
        <CategoryManager categories={categories} />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">Money and people</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Accounts and assets live on Money; anyone you lend to or borrow from
          lives in Settlements, on Money.
        </p>
        <div className="mt-3 flex flex-wrap gap-4">
          <Link
            href="/money"
            className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
          >
            Money
            <ArrowSquareOut size={14} weight="bold" />
          </Link>
          <Link
            href="/money#settlements"
            className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
          >
            Settlements
            <ArrowSquareOut size={14} weight="bold" />
          </Link>
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">Your data</h2>
        <p className="mt-0.5 mb-4 text-sm text-muted-foreground">
          Download everything you&rsquo;ve entered, or delete it all. Both work whatever your plan.
        </p>
        <AccountData />
      </section>
    </div>
  );
}
