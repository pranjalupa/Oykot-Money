import { WifiSlash } from "@phosphor-icons/react/dist/ssr";

export const metadata = { title: "No connection — Oykot Money" };

/** Shown by the service worker when a page is opened with no network. */
export default function OfflinePage() {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-3 px-6 text-center">
      <WifiSlash size={32} className="text-muted-foreground" />
      <h1 className="font-heading text-xl font-bold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Oykot Money needs a connection to load your budget. Anything you were looking at will be
        here when you&apos;re back.
      </p>
    </div>
  );
}
