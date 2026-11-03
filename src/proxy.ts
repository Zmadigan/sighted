import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// A quick first check: if there's no login cookie at all, go to /login.
// Each app page also verifies the session for real (see src/lib/session.ts).
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/identify/:path*", "/journal/:path*", "/life-list/:path*", "/map/:path*", "/sightings/:path*", "/upgrade/:path*", "/billing/:path*", "/friends/:path*", "/year-in-review", "/account"],
};
