import { NextResponse } from "next/server";
import { readJson, route } from "@/server/api/route";
import { listCases } from "@/server/services/cases";
import { createCase } from "@/server/services/case-create";
import { loadCaseSearchParams } from "@/lib/cases/search-params";
import { caseCreateSchema } from "@/lib/validation/case-create";

// GET /api/cases?q=&status=a,b&priority=&area=&sort=openedAt&order=desc&page=1&size=10
export const GET = route("case:read", async ({ req }) => {
  const params = loadCaseSearchParams(req.nextUrl.searchParams);
  return listCases(params);
});

// POST /api/cases: body validated with the same schema the wizard uses.
export const POST = route("case:create", async ({ req, session }) => {
  const input = await readJson(req, caseCreateSchema);
  const created = await createCase(input, session);
  return NextResponse.json(created, { status: 201 });
});
