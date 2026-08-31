import { NextRequest, NextResponse } from "next/server";

// Optimistic check only — cookie presence, not a real session lookup. Proxy
// also runs on prefetch, so a DB round-trip here would fire on every hover
// over the "Add Card" link, not just real navigations. The actual gate is
// every mutating/cost-incurring route independently calling the full
// DB-backed auth() from src/auth.ts; this just redirects the obvious case
// for a better logged-out UX before the page even loads.
const SESSION_COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"];

export default function proxy(req: NextRequest) {
  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) => req.cookies.has(name));
  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/scan"],
};
