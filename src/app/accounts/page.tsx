import { redirect } from "next/navigation";

/**
 * Moved to /money. Kept as a redirect because "accounts" was the word this app
 * used for its first six months — bookmarks and muscle memory both point here.
 */
export default function AccountsPage() {
  redirect("/money");
}
