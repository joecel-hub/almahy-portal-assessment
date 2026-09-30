import { forbidden, readJson, route } from "@/server/api/route";
import { bulkUpdateCases } from "@/server/services/cases";
import { caseBulkSchema } from "@/lib/validation/case";
import { can } from "@/lib/auth/permissions";

// POST /api/cases/bulk  { action: "delete" | "set_status" | "assign", ids: number[], ... }
export const POST = route("case:update", async ({ req, session }) => {
  const input = await readJson(req, caseBulkSchema);
  // Deleting needs a stronger permission than editing.
  if (input.action === "delete" && !can(session.role, "case:delete")) throw forbidden();
  return bulkUpdateCases(input, session);
});
