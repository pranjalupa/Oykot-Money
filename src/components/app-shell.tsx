import { AppNav } from "@/components/app-nav";
import { TrialBanner } from "@/components/trial-banner";
import type { AccessState } from "@/lib/access";

export function AppShell({
  signedIn,
  email,
  name,
  trial,
  sidebarCollapsed,
  children,
}: {
  signedIn: boolean;
  email: string | null;
  name: string | null;
  trial: { state: AccessState; daysLeft: number | null; enforced: boolean } | null;
  sidebarCollapsed: boolean;
  children: React.ReactNode;
}) {
  if (!signedIn) return <>{children}</>;

  return (
    <div className="min-h-svh">
      <AppNav email={email} name={name} collapsed={sidebarCollapsed} />
      {/* Offset matches the fixed sidebar's width, which follows
          <html data-sidebar>; on mobile the nav is a sticky bar above, so no offset. */}
      <div className="transition-[padding] duration-200 lg:pl-56 lg:[[data-sidebar=collapsed]_&]:pl-14">
        <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-24 sm:px-6 lg:pt-8">
          {trial && <TrialBanner {...trial} />}
          {children}
        </main>
      </div>
    </div>
  );
}
