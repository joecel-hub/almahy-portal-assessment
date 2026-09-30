"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import type { PageMeta } from "@/lib/api/types";

type PaginationProps = {
  meta: PageMeta;
  pageSizes: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function Pagination({ meta, pageSizes, onPageChange, onPageSizeChange }: PaginationProps) {
  const { page, pageSize, total, totalPages } = meta;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-muted-foreground tabular" aria-live="polite">
        Showing <span className="font-medium text-foreground">{formatNumber(from)}–{formatNumber(to)}</span> of{" "}
        <span className="font-medium text-foreground">{formatNumber(total)}</span>
      </p>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-muted-foreground">
          Rows
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 cursor-pointer rounded-md border border-input bg-card px-2 text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <span className="text-muted-foreground tabular">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </nav>
  );
}
