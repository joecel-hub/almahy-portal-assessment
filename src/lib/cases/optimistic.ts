import type { Paginated } from "@/lib/api/types";
import type { CaseBulkInput } from "@/lib/validation/case";
import type { Assignee, CaseListItem } from "./types";

/**
 * Applies a bulk action to a cached page of cases *before* the server answers,
 * so the UI updates instantly. Pure function: easy to unit-test, and the
 * mutation hook can roll back simply by restoring the previous snapshot.
 */
export function applyBulkToPage(
  page: Paginated<CaseListItem>,
  input: CaseBulkInput,
  assignees: Assignee[],
): Paginated<CaseListItem> {
  const ids = new Set(input.ids);

  if (input.action === "delete") {
    const data = page.data.filter((row) => !ids.has(row.id));
    const removed = page.data.length - data.length;
    const total = Math.max(0, page.meta.total - removed);
    return {
      data,
      meta: { ...page.meta, total, totalPages: Math.max(1, Math.ceil(total / page.meta.pageSize)) },
    };
  }

  if (input.action === "set_status") {
    return {
      ...page,
      data: page.data.map((row) => (ids.has(row.id) ? { ...row, status: input.status } : row)),
    };
  }

  const person = assignees.find((a) => a.id === input.assigneeId);
  const assignee = person ? { id: person.id, name: person.name } : null;
  return {
    ...page,
    data: page.data.map((row) => (ids.has(row.id) ? { ...row, assignee } : row)),
  };
}
