import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import type { Session } from "@/lib/auth/token";

// Comparing against a throwaway hash when the email is unknown keeps the
// response time the same, so attackers cannot discover which emails have
// accounts by timing the login endpoint.
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser", 10);

export async function authenticate(email: string, password: string): Promise<Session | null> {
  const [user] = await db().select().from(users).where(eq(users.email, email)).limit(1);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return null;
  return { userId: user.id, name: user.name, email: user.email, role: user.role };
}
