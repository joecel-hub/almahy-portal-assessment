import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { requireSession } from "@/server/auth/session";
import { listTeam } from "@/server/services/directory";
import { PERMISSIONS, can, type Permission } from "@/lib/auth/permissions";
import { ROLES, ROLE_LABELS } from "@/lib/domain";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const metadata: Metadata = { title: "Settings" };

const PERMISSION_LABELS: Record<Permission, string> = {
  "dashboard:view": "View dashboard",
  "case:read": "View cases, documents & consultations",
  "case:create": "Open new cases",
  "case:update": "Edit cases & bulk update",
  "case:delete": "Delete cases",
  "client:read": "View clients",
  "client:create": "Register clients",
  "client:update": "Edit clients",
  "settings:manage": "See the team directory",
};

export default async function SettingsPage() {
  const session = await requireSession("dashboard:view");
  // The team directory is admin-only: fetched only when allowed, never just hidden.
  const team = can(session.role, "settings:manage") ? await listTeam() : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your account, appearance and access." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Profile</h2>
            </CardTitle>
            <CardDescription>Managed by your administrator.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-[120px_1fr]">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{session.name}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{session.email}</dd>
              <dt className="text-muted-foreground">Role</dt>
              <dd>
                <Badge>{ROLE_LABELS[session.role]}</Badge>
              </dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Appearance</h2>
            </CardTitle>
            <CardDescription>Switch between light and dark mode. Your choice is remembered on this device.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-sm">
            <ThemeToggle /> Toggle theme
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 pb-0">
        <CardHeader className="pb-4">
          <CardTitle>
            <h2>Roles &amp; permissions</h2>
          </CardTitle>
          <CardDescription>
            What each role can do. The server enforces these rules on every request; the interface only hides what you
            can&apos;t use.
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Permissions by role</caption>
            <thead className="border-y bg-muted/40">
              <tr>
                <th scope="col" className="px-5 py-3 text-left font-medium">
                  Permission
                </th>
                {ROLES.map((r) => (
                  <th key={r} scope="col" className="px-5 py-3 text-center font-medium">
                    {ROLE_LABELS[r]}
                    {r === session.role && <span className="block text-xs font-normal text-primary">(you)</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((p) => (
                <tr key={p} className="border-b last:border-0">
                  <th scope="row" className="px-5 py-2.5 text-left font-normal">
                    {PERMISSION_LABELS[p]}
                  </th>
                  {ROLES.map((r) => (
                    <td key={r} className="px-5 py-2.5 text-center">
                      {can(r, p) ? (
                        <Check className="mx-auto size-4 text-success" aria-label="Allowed" />
                      ) : (
                        <Minus className="mx-auto size-4 text-muted-foreground" aria-label="Not allowed" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {team && (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Team</h2>
            </CardTitle>
            <CardDescription>Visible to administrators only.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {team.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.title} · {u.email}
                    </p>
                  </div>
                  <Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
