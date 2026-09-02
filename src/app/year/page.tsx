import { redirect } from "next/navigation";

/** Folded into the home page's tabs. Kept so old links still land right. */
export default async function YearPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year } = await searchParams;
  redirect(year ? `/?view=year&year=${year}` : "/?view=year");
}
