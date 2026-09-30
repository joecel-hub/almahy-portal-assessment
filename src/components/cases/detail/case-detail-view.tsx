"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  ChevronDown,
  FileText,
  History,
  Mail,
  MapPin,
  Phone,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/states";
import { PriorityLabel, StatusBadge } from "@/components/cases/case-badges";
import { useCan } from "@/components/session-provider";
import { useCaseDetail, useDeleteCase, useUpdateCase } from "@/hooks/use-case-detail";
import { DetailList, EditableCard } from "./editable-card";
import { DetailsForm, EngagementForm } from "./section-forms";
import { ActivityTimeline } from "./activity-timeline";
import {
  CASE_STATUSES,
  CASE_STATUS_LABELS,
  CLIENT_TYPE_LABELS,
  CONSULTATION_MODE_LABELS,
  CONSULTATION_STATUS_LABELS,
  DOCUMENT_KIND_LABELS,
  FEE_TYPE_LABELS,
  PRACTICE_AREA_LABELS,
} from "@/lib/domain";
import { formatCurrency, formatDate, formatDateTime, formatFileSize, formatPlainDate } from "@/lib/format";
import type { Assignee } from "@/lib/cases/types";

export function CaseDetailView({ id, assignees }: { id: number; assignees: Assignee[] }) {
  // Hydrated from the server prefetch, so `data` is present on first render.
  const { data: detail, isError, error, refetch } = useCaseDetail(id);
  const update = useUpdateCase(id, assignees);
  const remove = useDeleteCase(id);
  const canUpdate = useCan("case:update");
  const canDelete = useCan("case:delete");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!detail) {
    return (
      <ErrorState
        title="Couldn't load this case"
        description={isError ? error.message : undefined}
        action={
          <Button variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  const save = (patch: Parameters<typeof update.mutateAsync>[0]) => update.mutateAsync(patch);
  const { client } = detail;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/cases"
          className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> All cases
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {detail.ref}
              </Badge>
              <StatusBadge status={detail.status} />
              <PriorityLabel priority={detail.priority} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">{detail.title}</h1>
            <p className="text-sm text-muted-foreground">
              {PRACTICE_AREA_LABELS[detail.practiceArea]} · Opened {formatDate(detail.openedAt)}
              {detail.assignee && ` · ${detail.assignee.name}`}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {canUpdate && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Change status <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Move to</DropdownMenuLabel>
                  {CASE_STATUSES.filter((s) => s !== detail.status).map((s) => (
                    // Fully optimistic: the badge changes instantly, rolls back on failure.
                    <DropdownMenuItem key={s} onSelect={() => update.mutate({ status: s })}>
                      {CASE_STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {canDelete && (
              <Button variant="outline" onClick={() => setConfirmDelete(true)} aria-label="Delete case">
                <Trash2 className="text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <EditableCard
            title="Matter details"
            canEdit={canUpdate}
            renderForm={(close) => <DetailsForm detail={detail} save={save} onDone={close} />}
          >
            <div className="space-y-5">
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {detail.description || <span className="text-muted-foreground">No description.</span>}
              </p>
              <DetailList
                items={[
                  { label: "Practice area", value: PRACTICE_AREA_LABELS[detail.practiceArea] },
                  { label: "Due date", value: detail.dueDate ? formatPlainDate(detail.dueDate) : null },
                  ...(detail.practiceArea === "litigation"
                    ? [
                        { label: "Court", value: detail.courtName },
                        { label: "Opposing party", value: detail.opposingParty },
                      ]
                    : []),
                ]}
              />
            </div>
          </EditableCard>

          <EditableCard
            title="Engagement"
            canEdit={canUpdate}
            renderForm={(close) => (
              <EngagementForm detail={detail} assignees={assignees} save={save} onDone={close} />
            )}
          >
            <DetailList
              items={[
                { label: "Priority", value: <PriorityLabel priority={detail.priority} /> },
                {
                  label: "Assigned lawyer",
                  value: detail.assignee ? `${detail.assignee.name} · ${detail.assignee.title}` : null,
                },
                { label: "Fee arrangement", value: FEE_TYPE_LABELS[detail.feeType] },
                {
                  label: "Fee",
                  value: (
                    <span className="tabular">
                      {formatCurrency(detail.feeAmount)}
                      {detail.feeType === "hourly" ? " per hour" : detail.feeType === "retainer" ? " per month" : ""}
                    </span>
                  ),
                },
              ]}
            />
          </EditableCard>

          <Card>
            <CardContent>
              <Tabs defaultValue="activity">
                <TabsList aria-label="Case records">
                  <TabsTrigger value="activity">
                    <History className="size-4" aria-hidden="true" /> Activity
                  </TabsTrigger>
                  <TabsTrigger value="documents">
                    <FileText className="size-4" aria-hidden="true" /> Documents
                    <Badge variant="secondary" className="px-1.5">
                      {detail.documents.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="consultations">
                    <CalendarClock className="size-4" aria-hidden="true" /> Consultations
                    <Badge variant="secondary" className="px-1.5">
                      {detail.consultations.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="activity">
                  <ActivityTimeline items={detail.activity} />
                </TabsContent>

                <TabsContent value="documents">
                  {detail.documents.length === 0 ? (
                    <EmptyState icon={FileText} title="No documents" description="Documents added to this case appear here." />
                  ) : (
                    <ul className="divide-y">
                      {detail.documents.map((d) => (
                        <li key={d.id} className="flex items-center gap-3 py-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                            <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{d.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {DOCUMENT_KIND_LABELS[d.kind]} · {formatFileSize(d.sizeKb)} · {d.uploadedBy ?? "Unknown"} ·{" "}
                              {formatDate(d.uploadedAt)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>

                <TabsContent value="consultations">
                  {detail.consultations.length === 0 ? (
                    <EmptyState
                      icon={CalendarClock}
                      title="No consultations"
                      description="Meetings linked to this case appear here."
                    />
                  ) : (
                    <ul className="divide-y">
                      {detail.consultations.map((c) => (
                        <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                          <div>
                            <p className="text-sm font-medium">{c.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(c.scheduledAt)} · {CONSULTATION_MODE_LABELS[c.mode]}
                              {c.lawyerName && ` · ${c.lawyerName}`}
                            </p>
                          </div>
                          <Badge variant={c.status === "scheduled" ? "info" : c.status === "completed" ? "success" : "secondary"}>
                            {CONSULTATION_STATUS_LABELS[c.status]}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Side column */}
        <aside className="min-w-0 space-y-6" aria-label="Related information">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Client</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {client.type === "company" ? (
                    <Building2 className="size-4" aria-hidden="true" />
                  ) : (
                    <UserRound className="size-4" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{CLIENT_TYPE_LABELS[client.type]}</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm">
                {client.contactName && (
                  <li className="flex items-center gap-2">
                    <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span>
                      <span className="sr-only">Contact: </span>
                      {client.contactName}
                    </span>
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
                {client.crNumber && (
                  <li className="text-xs text-muted-foreground">CR number: {client.crNumber}</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Key dates</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                {[
                  ["Opened", formatDate(detail.openedAt)],
                  ["Due", detail.dueDate ? formatPlainDate(detail.dueDate) : "Not set"],
                  ["Closed", detail.closedAt ? formatDate(detail.closedAt) : "Still active"],
                  ["Last updated", formatDateTime(detail.updatedAt)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right tabular">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Other cases for this client</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {detail.relatedCases.length === 0 ? (
                <p className="text-sm text-muted-foreground">This is the client&apos;s only case.</p>
              ) : (
                <ul className="space-y-3">
                  {detail.relatedCases.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/cases/${r.id}`}
                        className="group block rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <p className="truncate text-sm font-medium group-hover:underline">{r.title}</p>
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{r.ref}</span>
                          <StatusBadge status={r.status} />
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${detail.ref}?`}
        description="This permanently removes the case, its documents and its history. This cannot be undone."
        confirmLabel="Delete case"
        destructive
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
