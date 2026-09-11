/**
 * Shown while a server-rendered page loads. Every page here is dynamic, so
 * without this a click did nothing visible until the whole page arrived.
 * Shaped like a typical screen — header, a row of cards, a list — so the
 * layout doesn't jump when the real content lands.
 */
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-44 rounded-md bg-muted" />
          <div className="h-4 w-64 rounded-md bg-muted" />
        </div>
        <div className="h-9 w-24 rounded-md bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="size-8 rounded-md bg-muted" />
            <div className="h-4 flex-1 rounded-md bg-muted" />
            <div className="h-4 w-16 rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
