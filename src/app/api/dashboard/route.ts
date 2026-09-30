import { route } from "@/server/api/route";
import { getDashboard } from "@/server/services/dashboard";
import { loadDashboardParams, resolveRange } from "@/lib/dashboard/range";

// GET /api/dashboard?range=90d  or  ?range=custom&from=2026-01-01&to=2026-03-31
export const GET = route("dashboard:view", async ({ req }) => {
  const range = resolveRange(loadDashboardParams(req.nextUrl.searchParams));
  return getDashboard(range);
});
