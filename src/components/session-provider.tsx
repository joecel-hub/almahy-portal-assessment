"use client";

import { createContext, useContext } from "react";
import type { Session } from "@/lib/auth/token";
import { can, type Permission } from "@/lib/auth/permissions";

const SessionContext = createContext<Session | null>(null);

/**
 * Makes the signed-in user available to Client Components. The value comes
 * from the server layout (already verified), so there is no client-side
 * fetch and no loading state for "who am I".
 */
export function SessionProvider({ session, children }: { session: Session; children: React.ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside <SessionProvider>");
  return session;
}

/** UI-only permission check, e.g. to hide a Delete button. The API enforces the same rule. */
export function useCan(permission: Permission): boolean {
  return can(useSession().role, permission);
}
