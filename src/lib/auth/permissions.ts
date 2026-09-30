import type { Role } from "@/lib/domain";

/**
 * Role-based access control, defined once and used in two places:
 *  - the API enforces it (the real security boundary), and
 *  - the UI reads it to hide actions a user cannot perform (a UX nicety only).
 * Pure data + functions, so it is safe to import from Client Components.
 */
export const PERMISSIONS = [
  "dashboard:view",
  "case:read",
  "case:create",
  "case:update",
  "case:delete",
  "client:read",
  "client:create",
  "client:update",
  "settings:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  admin: new Set(PERMISSIONS),
  manager: new Set<Permission>([
    "dashboard:view",
    "case:read",
    "case:create",
    "case:update",
    "client:read",
    "client:create",
    "client:update",
  ]),
  viewer: new Set<Permission>(["dashboard:view", "case:read", "client:read"]),
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}
