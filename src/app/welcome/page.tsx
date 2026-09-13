import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupTargets, DEFAULT_MONTH } from "@/db/schema";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { listAccounts, listCategories } from "@/lib/budget";
import { ensureUserSetup, getProfile, requireUser } from "@/lib/auth";
import { DEFAULT_TARGETS } from "@/lib/targets";

export const dynamic = "force-dynamic";

/**
 * The setup wizard, for a new account. Home sends you here until it's finished
 * or skipped (`profiles.onboarded_at`); once it is, this page sends you home.
 */
export default async function WelcomePage() {
  const user = await requireUser();
  await ensureUserSetup(user.id);
  const profile = await getProfile();
  if (profile?.onboardedAt) redirect("/");

  const [accounts, categories, targets] = await Promise.all([
    listAccounts(user.id),
    listCategories(user.id),
    db
      .select({ groupKey: groupTargets.groupKey, percent: groupTargets.percent })
      .from(groupTargets)
      .where(and(eq(groupTargets.userId, user.id), eq(groupTargets.month, DEFAULT_MONTH))),
  ]);

  const split = { ...DEFAULT_TARGETS };
  for (const t of targets) if (t.groupKey in split) split[t.groupKey as keyof typeof split] = t.percent;

  const starter = categories.filter((c) => !c.archived && !c.parentId && !c.systemKey);

  return (
    <OnboardingWizard
      name={profile?.displayName ?? null}
      accounts={accounts
        .filter((a) => a.kind === "spending" && !a.archived)
        .map((a) => ({ id: a.id, name: a.name, subtype: a.subtype, balanceMinor: a.openingBalanceMinor }))}
      incomeCategories={starter.filter((c) => c.groupKey === "income").map((c) => ({ id: c.id, name: c.name }))}
      spendCategories={starter
        .filter((c) => c.groupKey !== "income")
        .map((c) => ({ id: c.id, name: c.name, icon: c.icon, groupKey: c.groupKey as "needs" | "wants" | "investments" }))}
      split={split}
    />
  );
}
