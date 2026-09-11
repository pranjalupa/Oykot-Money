import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { getUser } from "@/lib/auth";
import { LEGAL } from "@/lib/legal";

/**
 * Frame for the legal pages. Signed-in readers already have the app's nav,
 * so the public header and footer only appear for visitors.
 */
export async function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  const user = await getUser();
  return (
    <div className="min-h-svh">
      {!user && <PublicHeader />}
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-heading text-3xl font-extrabold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last updated {LEGAL.lastUpdated}</p>
        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
          {children}
        </div>
      </main>
      {!user && <PublicFooter />}
    </div>
  );
}

export function Contact() {
  return (
    <a href={`mailto:${LEGAL.email}`} className="font-medium underline underline-offset-4">
      {LEGAL.email}
    </a>
  );
}
