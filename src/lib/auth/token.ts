import { SignJWT, jwtVerify } from "jose";
import { ROLES, type Role } from "@/lib/domain";

/**
 * Session token: a short-lived HS256-signed JWT stored in an httpOnly cookie.
 * Kept free of `server-only` so proxy.ts can import it; the secret itself is
 * read from the server environment and never reaches the browser.
 */
export const SESSION_COOKIE = "almahy_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // one working day

export type Session = {
  userId: number;
  name: string;
  email: string;
  role: Role;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters (see .env.example).");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ name: session.name, email: session.email, role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(session.userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

/** Returns the session, or null if the token is missing, tampered with or expired. */
export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const role = payload.role as Role;
    if (!payload.sub || !ROLES.includes(role)) return null;
    return {
      userId: Number(payload.sub),
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      role,
    };
  } catch {
    return null;
  }
}
