import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once on first use.
 *
 * `server-only` makes importing this file from a Client Component a build
 * error, so secrets cannot leak into browser bundles by accident.
 */
const envSchema = z.object({
  DATABASE_URL: z.url({ message: "DATABASE_URL must be a Postgres connection URL" }),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

let cached: z.infer<typeof envSchema> | undefined;

// Lazy (not at import time) so `next build` can prerender static pages even
// before the hosting environment has its secrets configured.
export function env() {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
      throw new Error(`Invalid server environment:\n${issues.join("\n")}\nSee .env.example.`);
    }
    cached = parsed.data;
  }
  return cached;
}
