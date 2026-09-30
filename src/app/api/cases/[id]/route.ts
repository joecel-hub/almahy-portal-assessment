import { notFound, readJson, route } from "@/server/api/route";
import { deleteCase, updateCase } from "@/server/services/cases";
import { getCaseDetail } from "@/server/services/case-detail";
import { caseIdSchema, caseUpdateSchema } from "@/lib/validation/case";

type Params = { id: string };

export const GET = route<Params>("case:read", async ({ params }) => {
  const { id } = caseIdSchema.parse(params);
  const detail = await getCaseDetail(id);
  if (!detail) throw notFound("Case");
  return detail;
});

export const PATCH = route<Params>("case:update", async ({ req, params, session }) => {
  const { id } = caseIdSchema.parse(params);
  const input = await readJson(req, caseUpdateSchema);
  const updated = await updateCase(id, input, session);
  if (!updated) throw notFound("Case");
  return updated;
});

export const DELETE = route<Params>("case:delete", async ({ params }) => {
  const { id } = caseIdSchema.parse(params);
  if (!(await deleteCase(id))) throw notFound("Case");
  return { ok: true };
});
