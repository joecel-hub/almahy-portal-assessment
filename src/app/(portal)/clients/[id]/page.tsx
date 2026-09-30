import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, Building2, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { requireSession } from "@/server/auth/session";
import { getClient } from "@/server/services/directory";
import { caseIdSchema } from "@/lib/validation/case";
import { can } from "@/lib/auth/permissions";
import {
  CLIENT_TYPE_LABELS,
  CONSULTATION_MODE_LABELS,
  CONSULTATION_STATUS_LABELS,
  PRACTICE_AREA_LABELS,
} from "@/lib/domain";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/states";
import { StatusBadge } from "@/components/cases/case-badges";
import { SimpleTable } from "@/components/lists/simple-table";

async function loadClient(params: Promise<{ id: string }>) {
  const parsed = caseIdSchema.safeParse(await params); // same positive-integer id rule
  if (!parsed.success) notFound();
  return getClient(parsed.data.id);
}

export async function generateMetadata({ params }: PageProps<"/clients/[id]">): Promise<Metadata> {
  const client = await loadClient(params);
  return { title: client?.name ?? "Client not found" };
}

export default async function ClientDetailPage({ params }: PageProps<"/clients/[id]">) {
  const session = await requireSession("client:read");
  const client = await loadClient(params);
  if (!client) notFound();
  const active = client.cases.filter((c) => c.status !== "closed").length;

  return (
    <div className="space-y-6">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> All clients
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {client.type === "company" ? <Building2 className="size-5" aria-hidden="true" /> : <UserRound className="size-5" aria-hidden="true" />}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <p className="text-sm text-muted-foreground">
              {CLIENT_TYPE_LABELS[client.type]} · {client.city} · Client since {formatDate(client.createdAt)}
            </p>
          </div>
        </div>
        {can(session.role, "case:create") && (
          <Button asChild>
            <Link href="/cases/new">
              <Briefcase /> New case
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Contact</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {client.contactName && (
                <li className="flex items-center gap-2">
                  <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
                  {client.contactName}
                </li>
              )}
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
                <a href={`mailto:${client.email}`} className="truncate hover:underline">
                  {client.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" aria-hidden="true" />
                <a href={`tel:${client.phone.replace(/\s/g, "")}`} className="hover:underline">
                  {client.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
                {client.city}
              </li>
              {client.crNumber && <li className="text-xs text-muted-foreground">Trade licence no. {client.crNumber}</li>}
            </ul>
            <dl className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Active cases</dt>
                <dd className="text-xl font-semibold tabular">{active}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">All cases</dt>
                <dd className="text-xl font-semibold tabular">{client.cases.length}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="gap-0 pb-0 lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle>
              <h2>Cases</h2>
            </CardTitle>
          </CardHeader>
          <SimpleTable
            caption={`Cases for ${client.name}`}
            rows={client.cases}
            rowKey={(c) => c.id}
            empty={<EmptyState icon={Briefcase} title="No cases yet" />}
            columns={[
              {
                header: "Case",
                cell: (c) => (
                  <div className="min-w-44">
                    <Link href={`/cases/${c.id}`} className="font-medium hover:underline">
                      {c.title}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">{c.ref}</p>
                  </div>
                ),
              },
              { header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
              { header: "Area", cell: (c) => PRACTICE_AREA_LABELS[c.practiceArea], className: "hidden md:table-cell" },
              {
                header: "Fee",
                cell: (c) => <span className="whitespace-nowrap tabular">{formatCurrency(c.feeAmount)}</span>,
                className: "hidden sm:table-cell text-right",
              },
              { header: "Opened", cell: (c) => <span className="whitespace-nowrap tabular">{formatDate(c.openedAt)}</span>, className: "hidden md:table-cell" },
            ]}
          />
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Recent consultations</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client.consultations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No consultations yet.</p>
          ) : (
            <ul className="divide-y">
              {client.consultations.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{c.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(c.scheduledAt)} · {CONSULTATION_MODE_LABELS[c.mode]}
                    </p>
                  </div>
                  <Badge variant={c.status === "scheduled" ? "info" : c.status === "completed" ? "success" : "secondary"}>
                    {CONSULTATION_STATUS_LABELS[c.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
