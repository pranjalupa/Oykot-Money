import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { TargetEditor } from "@/components/target-editor";
import { CategoryManager } from "@/components/category-manager";
import {
  currentMonth,
  getTargets,
  hasMonthOverride,
  isValidMonth,
  listCategories,
  monthLabel,
} from "@/lib/budget";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const { month: monthParam } = await searchParams;
  const month = isValidMonth(monthParam) ? monthParam : currentMonth();

  const [targets, override, categories] = await Promise.all([
    getTargets(user.id, month),
    hasMonthOverride(user.id, month),
    listCategories(user.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Signed in as {user.email}.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">Target split</h2>
        <p className="mt-0.5 mb-4 text-sm text-muted-foreground">
          How you want income divided. The classic rule is 50/30/20 — change it
          to whatever actually fits. Editing {monthLabel(month)} only bends that
          month.
        </p>
        <TargetEditor targets={targets} month={month} hasOverride={override} />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">Categories</h2>
        <p className="mt-0.5 mb-4 text-sm text-muted-foreground">
          Rename, re-group, or retire any of them. Retiring keeps past
          transactions intact — it just stops the category appearing in new ones.
        </p>
        <CategoryManager categories={categories} />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">Accounts</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Bank accounts, people you&rsquo;ve lent to, and assets live on their
          own page.
        </p>
        <Link
          href="/accounts"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
        >
          Manage accounts
          <ArrowSquareOut size={14} weight="bold" />
        </Link>
      </section>
    </div>
  );
}
