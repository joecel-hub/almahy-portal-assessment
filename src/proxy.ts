import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

/**
 * Runs before every page request (Next 16 "proxy", formerly middleware).
 *
 * This is an *optimistic* gate for fast redirects: signed-out users never see
 * a flash of the portal. It is not the security boundary — every page and API
 * route checks the session and role again on the server.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const isLogin = pathname === "/login";

  if (!session && !isLogin) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (session && (isLogin || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Pages only: API routes answer 401 JSON themselves; static assets are skipped.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico)$).*)"],
};
