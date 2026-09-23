import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes reachable without a session. Everything else redirects to /login. */
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/auth",
  "/pricing",
  "/legal",
  // Payment providers call these server-to-server with no cookie. Gating them
  // behind the session turns every webhook into a 307 to /login, which the
  // provider reads as a failure and retries until it gives up. They carry
  // their own signature; that's what makes them safe, not the session.
  "/api/webhooks",
];

/**
 * The files that make the app installable. A browser fetches these without
 * the user's cookies in some contexts, and a service worker that 307s to
 * /login can't be registered at all — so they're never gated.
 */
const APP_FILES = ["/manifest.webmanifest", "/sw.js", "/offline"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() revalidates against Supabase — don't trust getSession() here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // The landing page's real home is /landing, but nobody should see that
  // address: send it back to "/", which serves it (below).
  if (pathname === "/landing") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Signed out, "/" is the landing page. It's served from its own segment by
  // a rewrite — the address bar still says "/" — because app/loading.tsx wraps
  // every route beside it, and a visitor's first frame would otherwise be a
  // grey skeleton of a budget they don't have. app/landing/loading.tsx is the
  // Forest band instead, so any flash is seamless.
  if (!user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/landing";
    const rewrite = NextResponse.rewrite(url, { request });
    // Keep whatever Supabase set (clearing a stale session, say).
    for (const cookie of response.cookies.getAll()) rewrite.cookies.set(cookie);
    return rewrite;
  }

  const isPublic = APP_FILES.includes(pathname) || PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Send them back where they were headed once they're in.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
