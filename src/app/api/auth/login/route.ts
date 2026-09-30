import { ApiError, publicRoute, readJson } from "@/server/api/route";
import { authenticate } from "@/server/services/auth";
import { createSessionCookie } from "@/server/auth/session";
import { recordFailure, resetRateLimit, retryAfter } from "@/server/rate-limit";
import { loginSchema } from "@/lib/validation/auth";

const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60_000;

export const POST = publicRoute(async (req) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `login:${ip}`;
  const wait = retryAfter(key, MAX_FAILURES);
  if (wait > 0) {
    throw new ApiError(429, "rate_limited", `Too many failed attempts. Try again in ${Math.ceil(wait / 60)} min.`);
  }

  const { email, password } = await readJson(req, loginSchema);
  const session = await authenticate(email, password);
  if (!session) {
    recordFailure(key, WINDOW_MS);
    // One message for both "no such user" and "wrong password".
    throw new ApiError(401, "invalid_credentials", "Invalid email or password");
  }

  resetRateLimit(key);
  await createSessionCookie(session);
  return { user: session };
});
