import { describe, expect, it } from "vitest";
import { applyBulkToPage } from "../optimistic";
import type { Paginated } from "@/lib/api/types";
import type { CaseListItem } from "../types";

const row = (id: number, overrides: Partial<CaseListItem> = {}): CaseListItem => ({
  id,
  ref: `ALM-2026-${String(id).padStart(4, "0")}`,
  title: `Case ${id}`,
  status: "open",
  priority: "medium",
  practiceArea: "corporate",
  feeType: "fixed",
  feeAmount: 1000,
  openedAt: "2026-09-01T10:00:00.000Z",
  dueDate: null,
  client: { id: 1, name: "Client" },
  assignee: null,
  ...overrides,
});

const page: Paginated<CaseListItem> = {
  data: [row(1), row(2), row(3)],
  meta: { page: 1, pageSize: 2, total: 5, totalPages: 3 },
};
const assignees = [{ id: 9, name: "Rania Saleh", title: "Associate" }];

describe("applyBulkToPage()", () => {
  it("removes deleted rows and recomputes totals", () => {
    const next = applyBulkToPage(page, { action: "delete", ids: [1, 3] }, assignees);
    expect(next.data.map((r) => r.id)).toEqual([2]);
    expect(next.meta).toMatchObject({ total: 3, totalPages: 2 });
  });

  it("changes status only on the selected rows", () => {
    const next = applyBulkToPage(page, { action: "set_status", ids: [2], status: "closed" }, assignees);
    expect(next.data.map((r) => r.status)).toEqual(["open", "closed", "open"]);
  });

  it("assigns and unassigns using the assignee's name", () => {
    const assigned = applyBulkToPage(page, { action: "assign", ids: [1], assigneeId: 9 }, assignees);
    expect(assigned.data[0].assignee).toEqual({ id: 9, name: "Rania Saleh" });
    const cleared = applyBulkToPage(assigned, { action: "assign", ids: [1], assigneeId: null }, assignees);
    expect(cleared.data[0].assignee).toBeNull();
  });

  it("never mutates the cached page (so rollback can restore it)", () => {
    const before = structuredClone(page);
    applyBulkToPage(page, { action: "set_status", ids: [1, 2, 3], status: "on_hold" }, assignees);
    expect(page).toEqual(before);
  });
});
