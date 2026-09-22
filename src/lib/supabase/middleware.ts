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
  // "/" is the landing page when signed out, the app when signed in.
  // "/" is not public: with the landing page gone it redirects to /login.
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
