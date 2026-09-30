"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { debounce, useQueryStates } from "nuqs";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreHorizontal, Search, Trash2, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { Pagination } from "@/components/data-table/pagination";
import { FacetFilter } from "@/components/data-table/facet-filter";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/states";
import { PriorityLabel, StatusBadge } from "@/components/cases/case-badges";
import { useCan } from "@/components/session-provider";
import { casesListQuery, useBulkCaseAction, useCasesList } from "@/hooks/use-cases";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  PAGE_SIZES,
  caseSearchParams,
  serializeCaseSearchParams,
  type CaseSortField,
} from "@/lib/cases/search-params";
import type { Assignee, CaseListItem } from "@/lib/cases/types";
import type { CaseBulkInput } from "@/lib/validation/case";
import {
  CASE_PRIORITIES,
  CASE_PRIORITY_LABELS,
  CASE_STATUSES,
  CASE_STATUS_LABELS,
  PRACTICE_AREAS,
  PRACTICE_AREA_LABELS,
} from "@/lib/domain";
import { formatCurrency, formatDate } from "@/lib/format";

const EMPTY_SELECTION: ReadonlySet<number> = new Set();

export function CasesTable({ assignees }: { assignees: Assignee[] }) {
  // URL state: every filter/sort/page change updates the address bar (shareable,
  // back-button friendly). `shallow` keeps it client-side: TanStack Query fetches
  // the data, the page's Server Component does not re-render.
  const [params, setParams] = useQueryStates(caseSearchParams, { shallow: true, history: "push" });

  // Search updates the URL on every keystroke (debounced), but the API is only
  // called once typing pauses.
  const debouncedQ = useDebouncedValue(params.q, 300);
  const queryParams = useMemo(() => ({ ...params, q: debouncedQ }), [params, debouncedQ]);
  const { data, isPending, isFetching, isError, error, refetch } = useCasesList(queryParams);
  const isTyping = params.q !== debouncedQ;

  // Prefetch the next page in the background, so "Next" is instant.
  const queryClient = useQueryClient();
  useEffect(() => {
    if (data && data.meta.page < data.meta.totalPages) {
      void queryClient.prefetchQuery(casesListQuery({ ...queryParams, page: data.meta.page + 1 }));
    }
  }, [data, queryParams, queryClient]);

  // Selection belongs to one result set: changing filters/page clears it,
  // derived from a key instead of an effect.
  const selectionKey = serializeCaseSearchParams({ ...queryParams, page: data?.meta.page ?? queryParams.page });
  const [selection, setSelection] = useState({ key: selectionKey, ids: EMPTY_SELECTION });
  const selected = selection.key === selectionKey ? selection.ids : EMPTY_SELECTION;
  const updateSelected = useCallback(
    (update: (prev: ReadonlySet<number>) => Set<number>) =>
      setSelection((s) => ({ key: selectionKey, ids: update(s.key === selectionKey ? s.ids : EMPTY_SELECTION) })),
    [selectionKey],
  );
  const clearSelection = () => setSelection({ key: selectionKey, ids: EMPTY_SELECTION });

  const canUpdate = useCan("case:update");
  const canDelete = useCan("case:delete");
  const bulk = useBulkCaseAction(assignees);
  const [pendingDelete, setPendingDelete] = useState<number[] | null>(null);

  function runBulk(input: CaseBulkInput) {
    bulk.mutate(input);
    clearSelection();
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    runBulk({ action: "delete", ids: pendingDelete });
    setPendingDelete(null);
  }

  const onSortChange = useCallback(
    (key: string) => {
      const field = key as CaseSortField;
      void setParams((p) => ({
        sort: field,
        // Clicking the active column flips direction; a new column starts descending.
        order: p.sort === field && p.order === "desc" ? "asc" : "desc",
        page: 1,
      }));
    },
    [setParams],
  );

  const columns = useMemo<Column<CaseListItem>[]>(
    () => [
      {
        id: "ref",
        header: "Case",
        sortKey: "ref",
        cell: (c) => (
          <div className="min-w-44 sm:min-w-56">
            <Link
              href={`/cases/${c.id}`}
              className="font-medium hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {c.title}
            </Link>
            <p className="font-mono text-xs text-muted-foreground">{c.ref}</p>
          </div>
        ),
      },
      {
        id: "client",
        header: "Client",
        cell: (c) => <span className="whitespace-nowrap">{c.client.name}</span>,
        className: "hidden md:table-cell",
      },
      { id: "status", header: "Status", sortKey: "status", cell: (c) => <StatusBadge status={c.status} /> },
      {
        id: "priority",
        header: "Priority",
        sortKey: "priority",
        cell: (c) => <PriorityLabel priority={c.priority} />,
        className: "hidden sm:table-cell",
      },
      {
        id: "area",
        header: "Practice area",
        cell: (c) => <span className="whitespace-nowrap">{PRACTICE_AREA_LABELS[c.practiceArea]}</span>,
        className: "hidden xl:table-cell",
      },
      {
        id: "assignee",
        header: "Assignee",
        cell: (c) =>
          c.assignee ? (
            <span className="whitespace-nowrap">{c.assignee.name}</span>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          ),
        className: "hidden lg:table-cell",
      },
      {
        id: "fee",
        header: "Fee",
        sortKey: "feeAmount",
        cell: (c) => (
          <span className="whitespace-nowrap tabular">
            {formatCurrency(c.feeAmount)}
            {c.feeType === "hourly" ? "/h" : c.feeType === "retainer" ? "/mo" : ""}
          </span>
        ),
        className: "hidden xl:table-cell text-right",
      },
      {
        id: "opened",
        header: "Opened",
        sortKey: "openedAt",
        cell: (c) => <span className="whitespace-nowrap text-muted-foreground tabular">{formatDate(c.openedAt)}</span>,
        className: "hidden md:table-cell",
      },
      {
        id: "actions",
        header: "",
        cell: (c) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.ref}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/cases/${c.id}`}>Open case</Link>
              </DropdownMenuItem>
              {canUpdate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Set status</DropdownMenuLabel>
                  {CASE_STATUSES.filter((s) => s !== c.status).map((s) => (
                    <DropdownMenuItem key={s} onSelect={() => runBulk({ action: "set_status", ids: [c.id], status: s })}>
                      {CASE_STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete([c.id])}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        className: "w-12 text-right",
      },
    ],
    // runBulk only closes over stable setters and the mutation object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canDelete],
  );

  const hasFilters = !!params.q || params.status.length > 0 || params.priority.length > 0 || params.area.length > 0;
  const resetFilters = () => void setParams({ q: null, status: null, priority: null, area: null, page: null });
  const rows = data?.data ?? [];
  const selectedIds = [...selected];

  return (
    <Card className="gap-0 py-0">
      {/* Toolbar: search + filters, or bulk actions when rows are selected */}
      <div className="flex min-h-16 flex-wrap items-center gap-2 border-b p-3">
        {selectedIds.length > 0 && canUpdate ? (
          <div className="flex w-full flex-wrap items-center gap-2" role="toolbar" aria-label="Bulk actions">
            <span className="text-sm font-medium" aria-live="polite">
              {selectedIds.length} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X /> Clear
            </Button>
            <div className="ml-auto flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Set status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {CASE_STATUSES.map((s) => (
                    <DropdownMenuItem key={s} onSelect={() => runBulk({ action: "set_status", ids: selectedIds, status: s })}>
                      {CASE_STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserRound /> Assign
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {assignees.map((a) => (
                    <DropdownMenuItem key={a.id} onSelect={() => runBulk({ action: "assign", ids: selectedIds, assigneeId: a.id })}>
                      {a.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => runBulk({ action: "assign", ids: selectedIds, assigneeId: null })}>
                    Unassign
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {canDelete && (
                <Button variant="destructive" size="sm" onClick={() => setPendingDelete(selectedIds)}>
                  <Trash2 /> Delete
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                aria-label="Search cases by title, reference or client"
                placeholder="Search title, ref or client…"
                className="pl-9"
                value={params.q}
                onChange={(e) =>
                  void setParams(
                    { q: e.target.value || null, page: null },
                    { history: "replace", limitUrlUpdates: debounce(300) },
                  )
                }
              />
              {(isTyping || (isFetching && !isPending)) && (
                <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <FacetFilter
              label="Status"
              options={CASE_STATUSES}
              labels={CASE_STATUS_LABELS}
              value={params.status}
              onChange={(status) => void setParams({ status, page: null })}
            />
            <FacetFilter
              label="Priority"
              options={CASE_PRIORITIES}
              labels={CASE_PRIORITY_LABELS}
              value={params.priority}
              onChange={(priority) => void setParams({ priority, page: null })}
            />
            <FacetFilter
              label="Practice area"
              options={PRACTICE_AREAS}
              labels={PRACTICE_AREA_LABELS}
              value={params.area}
              onChange={(area) => void setParams({ area, page: null })}
            />
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Reset <X />
              </Button>
            )}
          </>
        )}
      </div>

      {isError && !data ? (
        <ErrorState
          title="Couldn't load cases"
          description={error.message}
          action={
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      ) : (
        <DataTable
          caption={`Cases${data ? `, page ${data.meta.page} of ${data.meta.totalPages}` : ""}, sorted by ${params.sort} ${params.order === "asc" ? "ascending" : "descending"}`}
          columns={columns}
          rows={rows}
          getRowId={(c) => c.id}
          sort={{ key: params.sort, order: params.order }}
          onSortChange={onSortChange}
          selected={canUpdate ? selected : undefined}
          onSelectedChange={canUpdate ? updateSelected : undefined}
          isLoading={isPending}
          isFetching={isFetching}
          skeletonRows={params.size}
          empty={
            hasFilters ? (
              <EmptyState
                icon={Search}
                title="No cases match these filters"
                description="Try a different search term or remove some filters."
                action={
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState title="No cases yet" description="Cases you open will appear here." />
            )
          }
        />
      )}

      {data && data.meta.total > 0 && (
        <Pagination
          meta={data.meta}
          pageSizes={PAGE_SIZES}
          onPageChange={(page) => void setParams({ page })}
          onPageSizeChange={(size) => void setParams({ size: size as (typeof PAGE_SIZES)[number], page: null })}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete ${pendingDelete?.length === 1 ? "this case" : `${pendingDelete?.length} cases`}?`}
        description="This permanently removes the case with its documents, consultations links and history. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
