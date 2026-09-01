import { AppNav } from "@/components/app-nav";

export function AppShell({
  signedIn,
  email,
  children,
}: {
  signedIn: boolean;
  email: string | null;
  children: React.ReactNode;
}) {
  if (!signedIn) return <>{children}</>;

  return (
    <div className="min-h-svh">
      <AppNav email={email} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
