import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
  verifySession,
  type Session,
} from "@/lib/auth/token";
import { can, type Permission } from "@/lib/auth/permissions";

/**
 * Reads and verifies the session cookie. Wrapped in React's `cache` so the
 * layout, page and any nested Server Component share one verification per
 * request instead of each re-verifying the JWT.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
});

/** For Server Components: redirect to /login (or 403 page) instead of rendering. */
export async function requireSession(permission?: Permission): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (permission && !can(session.role, permission)) redirect("/dashboard?denied=1");
  return session;
}

export async function createSessionCookie(session: Session) {
  const token = await signSession(session);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true, // not readable from JavaScript → not stealable via XSS
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax", // not sent on cross-site POSTs → CSRF protection
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function deleteSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
