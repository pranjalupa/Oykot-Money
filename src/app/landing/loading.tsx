/**
 * What a visitor sees for the moment before the landing page streams in: the
 * page's own background, empty. The root loading.tsx is the app's skeleton —
 * a grey dashboard a stranger doesn't have — which is why this segment exists.
 */
export default function LandingLoading() {
  return <div role="status" aria-label="Loading" className="min-h-svh bg-background" />;
}
