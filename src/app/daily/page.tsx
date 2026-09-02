import { redirect } from "next/navigation";

/** Folded into the home page's tabs. Kept so old links still land right. */
export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  redirect(month ? `/?view=daily&month=${month}` : "/?view=daily");
}
