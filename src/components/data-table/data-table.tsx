"use client";

import { memo, useCallback } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** When set, the header becomes a sort button for this server-side sort key. */
  sortKey?: string;
  /** e.g. "hidden md:table-cell" to drop low-priority columns on small screens. */
  className?: string;
};

export type SortState = { key: string; order: "asc" | "desc" };

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => number;
  /** Screen-reader description of the table. */
  caption: string;
  sort?: SortState;
  onSortChange?: (key: string) => void;
  /** Enables the checkbox column. */
  selected?: ReadonlySet<number>;
  /** Receives an updater, like React's setState, so row callbacks can stay stable. */
  onSelectedChange?: (update: (prev: ReadonlySet<number>) => Set<number>) => void;
  /** No data yet: render skeleton rows. */
  isLoading?: boolean;
  /** Refreshing existing data: dim the rows and mark the table busy. */
  isFetching?: boolean;
  skeletonRows?: number;
  empty?: React.ReactNode;
};

/**
 * Generic, typed table for server-driven lists. It owns no data logic:
 * sorting, pagination and filtering happen on the server; this component only
 * renders rows and reports user intent through callbacks.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  caption,
  sort,
  onSortChange,
  selected,
  onSelectedChange,
  isLoading = false,
  isFetching = false,
  skeletonRows = 10,
  empty,
}: DataTableProps<T>) {
  const selectable = !!selected && !!onSelectedChange;
  const pageIds = rows.map(getRowId);
  const selectedOnPage = pageIds.filter((id) => selected?.has(id)).length;
  const allChecked = pageIds.length > 0 && selectedOnPage === pageIds.length;

  // Functional update → this callback does not depend on `selected`, so it is
  // stable and memoised rows don't re-render when a different row is toggled.
  const toggleRow = useCallback(
    (id: number, checked: boolean) => {
      onSelectedChange?.((prev) => {
        const next = new Set(prev);
        if (checked) next.add(id);
        else next.delete(id);
        return next;
      });
    },
    [onSelectedChange],
  );

  function toggleAll(checked: boolean) {
    onSelectedChange?.((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  const colSpan = columns.length + (selectable ? 1 : 0);

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full caption-bottom text-sm" aria-busy={isLoading || isFetching}>
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b bg-muted/40">
          <tr>
            {selectable && (
              <th scope="col" className="w-10 px-4 py-3">
                <Checkbox
                  aria-label="Select all rows on this page"
                  checked={allChecked ? true : selectedOnPage > 0 ? "indeterminate" : false}
                  onCheckedChange={(v) => toggleAll(v === true)}
                  disabled={rows.length === 0}
                />
              </th>
            )}
            {columns.map((col) => {
              const active = sort && col.sortKey === sort.key;
              return (
                <th
                  key={col.id}
                  scope="col"
                  aria-sort={active ? (sort.order === "asc" ? "ascending" : "descending") : undefined}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase",
                    col.className,
                  )}
                >
                  {col.sortKey && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(col.sortKey!)}
                      className="-mx-1 inline-flex cursor-pointer items-center gap-1 rounded px-1 uppercase outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      {col.header}
                      {active ? (
                        sort.order === "asc" ? (
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-40" aria-hidden="true" />
                      )}
                      <span className="sr-only">
                        {active ? `, sorted ${sort.order === "asc" ? "ascending" : "descending"}` : ", sortable"}
                      </span>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className={cn("transition-opacity", isFetching && !isLoading && "opacity-60")}>
          {isLoading ? (
            Array.from({ length: skeletonRows }, (_, i) => (
              <tr key={i} className="border-b last:border-0">
                {selectable && (
                  <td className="px-4 py-3.5">
                    <Skeleton className="size-4" />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.id} className={cn("px-4 py-3.5", col.className)}>
                    <Skeleton className="h-4 w-full max-w-40" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan}>{empty}</td>
            </tr>
          ) : (
            rows.map((row) => {
              const id = getRowId(row);
              return (
                <DataTableRow
                  key={id}
                  id={id}
                  row={row}
                  columns={columns}
                  selectable={selectable}
                  isSelected={!!selected?.has(id)}
                  onToggle={toggleRow}
                />
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

type RowProps<T> = {
  id: number;
  row: T;
  columns: Column<T>[];
  selectable: boolean;
  isSelected: boolean;
  onToggle: (id: number, checked: boolean) => void;
};

function DataTableRowInner<T>({ id, row, columns, selectable, isSelected, onToggle }: RowProps<T>) {
  return (
    <tr
      data-state={isSelected ? "selected" : undefined}
      className="border-b transition-colors last:border-0 hover:bg-muted/40 data-[state=selected]:bg-accent/60"
    >
      {selectable && (
        <td className="px-4 py-3">
          <Checkbox
            aria-label={`Select row ${id}`}
            checked={isSelected}
            onCheckedChange={(v) => onToggle(id, v === true)}
          />
        </td>
      )}
      {columns.map((col) => (
        <td key={col.id} className={cn("px-4 py-3 align-middle", col.className)}>
          {col.cell(row)}
        </td>
      ))}
    </tr>
  );
}

// memo: a row only re-renders when its own data or selection state changes.
const DataTableRow = memo(DataTableRowInner) as typeof DataTableRowInner;
