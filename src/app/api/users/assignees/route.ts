import { route } from "@/server/api/route";
import { listAssignees } from "@/server/services/cases";

// GET /api/users/assignees: lawyers a case can be assigned to.
export const GET = route("case:read", async () => listAssignees());
