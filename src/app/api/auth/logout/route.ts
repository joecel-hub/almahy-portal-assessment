import { publicRoute } from "@/server/api/route";
import { deleteSessionCookie } from "@/server/auth/session";

export const POST = publicRoute(async () => {
  await deleteSessionCookie();
  return { ok: true };
});
