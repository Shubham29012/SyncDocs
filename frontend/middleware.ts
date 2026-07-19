import { NextRequest, NextResponse } from "next/server";

// Routes that require a logged-in session
const PROTECTED = ["/dashboard", "/documents", "/search", "/notifications"];
// Routes that logged-in users should be bounced away from
const AUTH_ROUTES = ["/login", "/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Read session cookie directly (no external imports needed — works in Edge runtime)
  const sessionToken =
    req.cookies.get("next-auth.session-token")?.value ||           // http (dev)
    req.cookies.get("__Secure-next-auth.session-token")?.value;    // https (prod)

  const isAuthenticated = !!sessionToken;

  // Protected route + not logged in → redirect to /login
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (isProtected && !isAuthenticated) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Auth route + already logged in → redirect to /dashboard
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  if (isAuthRoute && isAuthenticated) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.delete("callbackUrl");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip static files, api routes, and _next internals
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
