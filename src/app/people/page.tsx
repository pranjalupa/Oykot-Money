import { redirect } from "next/navigation";

/** People moved into Money as Settlements. Old links and bookmarks land there. */
export default function PeoplePage() {
  redirect("/money#settlements");
}
