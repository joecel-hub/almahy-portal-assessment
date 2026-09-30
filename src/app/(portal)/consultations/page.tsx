import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { requireSession } from "@/server/auth/session";
import { listConsultations } from "@/server/services/directory";
import { loadConsultationListParams } from "@/lib/lists/search-params";
import {
  CONSULTATION_MODE_LABELS,
  CONSULTATION_STATUSES,
  CONSULTATION_STATUS_LABELS,
} from "@/lib/domain";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states";
import { ListToolbar } from "@/components/lists/list-toolbar";
import { LinkPagination, SimpleTable } from "@/components/lists/simple-table";

export const metadata: Metadata = { title: "Consultations" };

export default async function ConsultationsPage({ searchParams }: PageProps<"/consultations">) {
  await requireSession("case:read");
  const sp = await searchParams;
  const params = loadConsultationListParams(sp);
  const { data, meta } = await listConsultations(params);

  return (
    <div className="space-y-6">
      <PageHeader title="Consultations" description="Client meetings, calls and video consultations." />
      <Card className="gap-0 py-0">
        <ListToolbar
          filters={[
            {
              key: "status",
              label: "Status",
              allLabel: "All statuses",
              options: CONSULTATION_STATUSES.map((s) => ({ value: s, label: CONSULTATION_STATUS_LABELS[s] })),
            },
          ]}
        >
          {/* Upcoming / past as links: each view has its own URL. */}
          <nav aria-label="Time" className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
            {(["upcoming", "past"] as const).map((when) => (
              <Link
                key={when}
                href={when === "upcoming" ? "/consultations" : "/consultations?when=past"}
                aria-current={params.when === when ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1 font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  params.when === when && "bg-card text-foreground shadow-xs",
                )}
              >
                {when === "upcoming" ? "Upcoming" : "Past"}
              </Link>
            ))}
          </nav>
        </ListToolbar>
        <SimpleTable
          caption={`${params.when === "upcoming" ? "Upcoming" : "Past"} consultations`}
          rows={data}
          rowKey={(c) => c.id}
          empty={<EmptyState icon={CalendarClock} title="No consultations here" description="Try the other tab or a different status." />}
          columns={[
            {
              header: "When",
              cell: (c) => <span className="font-medium tabular sm:whitespace-nowrap">{formatDateTime(c.scheduledAt)}</span>,
            },
            {
              header: "Client",
              cell: (c) => (
                <div className="sm:min-w-40">
                  <Link href={`/clients/${c.clientId}`} className="hover:underline">
                    {c.clientName}
                  </Link>
                  <p className="text-xs text-muted-foreground">{c.subject}</p>
                  <p className="mt-1 text-xs text-muted-foreground sm:hidden">
                    {CONSULTATION_STATUS_LABELS[c.status]} · {CONSULTATION_MODE_LABELS[c.mode]}
                  </p>
                </div>
              ),
            },
            {
              header: "Case",
              cell: (c) =>
                c.caseId ? (
                  <Link href={`/cases/${c.caseId}`} className="font-mono text-xs hover:underline">
                    {c.caseRef}
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">Prospective</span>
                ),
              className: "hidden md:table-cell",
            },
            { header: "Lawyer", cell: (c) => c.lawyerName ?? "–", className: "hidden lg:table-cell" },
            { header: "Mode", cell: (c) => CONSULTATION_MODE_LABELS[c.mode], className: "hidden sm:table-cell" },
            {
              header: "Status",
              className: "hidden sm:table-cell",
              cell: (c) => (
                <Badge variant={c.status === "scheduled" ? "info" : c.status === "completed" ? "success" : "secondary"}>
                  {CONSULTATION_STATUS_LABELS[c.status]}
                </Badge>
              ),
            },
          ]}
        />
        <LinkPagination meta={meta} searchParams={sp} basePath="/consultations" />
      </Card>
    </div>
  );
}
