import { ApiError, publicRoute, readJson } from "@/server/api/route";
import { authenticate } from "@/server/services/auth";
import { createSessionCookie } from "@/server/auth/session";
import { rateLimit, resetRateLimit } from "@/server/rate-limit";
import { loginSchema } from "@/lib/validation/auth";

export const POST = publicRoute(async (req) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `login:${ip}`;
  const limit = rateLimit(key, 10, 15 * 60_000);
  if (!limit.ok) {
    throw new ApiError(429, "rate_limited", `Too many attempts. Try again in ${limit.retryAfter}s.`);
  }

  const { email, password } = await readJson(req, loginSchema);
  const session = await authenticate(email, password);
  // One message for both "no such user" and "wrong password".
  if (!session) throw new ApiError(401, "invalid_credentials", "Invalid email or password");

  resetRateLimit(key);
  await createSessionCookie(session);
  return { user: session };
});
