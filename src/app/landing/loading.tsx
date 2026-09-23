/**
 * What a visitor sees for the moment before the landing page streams in: the
 * hero's Forest band, empty. It's the same colour the page opens with, so the
 * swap reads as the content arriving, not as a different page loading.
 */
export default function LandingLoading() {
  return (
    <div role="status" aria-label="Loading" className="lp-grain relative min-h-svh bg-forest-950">
      <div aria-hidden className="lp-grid absolute inset-0" />
    </div>
  );
}
