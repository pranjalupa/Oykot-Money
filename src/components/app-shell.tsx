import { AppNav } from "@/components/app-nav";
import { TrialBanner } from "@/components/trial-banner";

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
  trial: React.ComponentProps<typeof TrialBanner> | null;
  sidebarCollapsed: boolean;
  children: React.ReactNode;
}) {
  if (!signedIn) return <>{children}</>;

  return (
    <div className="min-h-svh">
      {/* First thing in the tab order: the sidebar and the phone tab bar are a
          dozen links to walk past otherwise, on every page. Hidden until it's
          focused. */}
      <a
        href="#main"
        className="skip-link"
      >
        Skip to content
      </a>

      <AppNav email={email} name={name} collapsed={sidebarCollapsed} />
      {/* Offset matches the fixed sidebar's width, which follows
          <html data-sidebar>; on mobile the nav is a sticky bar above, so no offset. */}
      <div className="transition-[padding] duration-200 lg:pl-56 lg:[[data-sidebar=collapsed]_&]:pl-16">
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl px-4 pt-6 pb-24 sm:px-6 lg:pt-8">
          {trial && <TrialBanner {...trial} />}
          {children}
        </main>
      </div>
    </div>
  );
}
