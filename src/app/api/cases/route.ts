import { route } from "@/server/api/route";
import { listCases } from "@/server/services/cases";
import { loadCaseSearchParams } from "@/lib/cases/search-params";

// GET /api/cases?q=&status=a,b&priority=&area=&sort=openedAt&order=desc&page=1&size=10
export const GET = route("case:read", async ({ req }) => {
  const params = loadCaseSearchParams(req.nextUrl.searchParams);
  return listCases(params);
});
