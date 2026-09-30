import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type { PageMeta } from "@/lib/api/types";

export type SimpleColumn<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

/** Server-rendered table: no client JavaScript, just semantic HTML. */
export function SimpleTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  empty,
}: {
  caption: string;
  columns: SimpleColumn<T>[];
  rows: T[];
  rowKey: (row: T) => number;
  empty: React.ReactNode;
}) {
  if (rows.length === 0) return <>{empty}</>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b bg-muted/40">
          <tr>
            {columns.map((c) => (
              <th
                key={c.header}
                scope="col"
                className={cn("px-3 py-3 text-left text-xs font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase sm:px-4", c.className)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b last:border-0 hover:bg-muted/40">
              {columns.map((c) => (
                <td key={c.header} className={cn("px-3 py-3 align-middle sm:px-4", c.className)}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Pagination as plain links that keep the current filters. Works without
 * JavaScript, and each page has its own shareable URL.
 */
export function LinkPagination({
  meta,
  searchParams,
  basePath,
}: {
  meta: PageMeta;
  searchParams: Record<string, string | string[] | undefined>;
  basePath: string;
}) {
  if (meta.total === 0) return null;
  const href = (page: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string" && k !== "page") qs.set(k, v);
    if (page > 1) qs.set("page", String(page));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);
  const prev = meta.page > 1;
  const next = meta.page < meta.totalPages;
  const linkClass = buttonVariants({ variant: "outline", size: "icon-sm" });

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
      <p className="text-muted-foreground tabular">
        {formatNumber(from)}–{formatNumber(to)} of {formatNumber(meta.total)}
      </p>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground tabular">
          Page {meta.page} of {meta.totalPages}
        </span>
        <div className="flex gap-1">
          {prev ? (
            <Link href={href(meta.page - 1)} className={linkClass} aria-label="Previous page">
              <ChevronLeft />
            </Link>
          ) : (
            <span className={cn(linkClass, "pointer-events-none opacity-50")} aria-hidden="true">
              <ChevronLeft />
            </span>
          )}
          {next ? (
            <Link href={href(meta.page + 1)} className={linkClass} aria-label="Next page">
              <ChevronRight />
            </Link>
          ) : (
            <span className={cn(linkClass, "pointer-events-none opacity-50")} aria-hidden="true">
              <ChevronRight />
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
