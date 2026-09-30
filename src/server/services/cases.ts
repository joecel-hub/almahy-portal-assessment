import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, ne, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db";
import { activities, cases, clients, users } from "@/server/db/schema";
import { CASE_PRIORITY_LABELS, CASE_STATUS_LABELS, type CaseStatus } from "@/lib/domain";
import type { CaseListParams, CaseSortField } from "@/lib/cases/search-params";
import type { Assignee, CaseListItem } from "@/lib/cases/types";
import type { Paginated } from "@/lib/api/types";
import type { CaseBulkInput, CaseUpdateInput } from "@/lib/validation/case";
import type { Session } from "@/lib/auth/token";

const assignee = alias(users, "assignee");

// Whitelist: the URL can only choose from these columns, never inject SQL.
const SORT_COLUMNS = {
  openedAt: cases.openedAt,
  ref: cases.ref,
  title: cases.title,
  priority: cases.priority, // enum order: low < medium < high < urgent
  status: cases.status,
  feeAmount: cases.feeAmount,
  dueDate: cases.dueDate,
} satisfies Record<CaseSortField, unknown>;

/** Escape LIKE wildcards so a search for "50%" matches literally. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

const listSelection = {
  id: cases.id,
  ref: cases.ref,
  title: cases.title,
  status: cases.status,
  priority: cases.priority,
  practiceArea: cases.practiceArea,
  feeType: cases.feeType,
  feeAmount: cases.feeAmount,
  openedAt: cases.openedAt,
  dueDate: cases.dueDate,
  client: { id: clients.id, name: clients.name },
  assigneeId: assignee.id,
  assigneeName: assignee.name,
};

export async function listCases(params: CaseListParams): Promise<Paginated<CaseListItem>> {
  const filters: SQL[] = [];
  const q = params.q.trim();
  if (q) {
    const pattern = `%${likeEscape(q)}%`;
    filters.push(or(ilike(cases.title, pattern), ilike(cases.ref, pattern), ilike(clients.name, pattern))!);
  }
  if (params.status.length) filters.push(inArray(cases.status, params.status));
  if (params.priority.length) filters.push(inArray(cases.priority, params.priority));
  if (params.area.length) filters.push(inArray(cases.practiceArea, params.area));
  const where = filters.length ? and(...filters) : undefined;

  const page = Math.max(1, params.page);
  const direction = params.order === "asc" ? asc : desc;

  // The page of rows and the total count run in parallel.
  const [rows, [{ total }]] = await Promise.all([
    db()
      .select(listSelection)
      .from(cases)
      .innerJoin(clients, eq(cases.clientId, clients.id))
      .leftJoin(assignee, eq(cases.assigneeId, assignee.id))
      .where(where)
      // Secondary sort on id keeps pagination stable when values tie.
      .orderBy(direction(SORT_COLUMNS[params.sort]), desc(cases.id))
      .limit(params.size)
      .offset((page - 1) * params.size),
    db()
      .select({ total: count() })
      .from(cases)
      .innerJoin(clients, eq(cases.clientId, clients.id))
      .where(where),
  ]);

  return {
    data: rows.map(({ assigneeId, assigneeName, ...row }) => ({
      ...row,
      assignee: assigneeId ? { id: assigneeId, name: assigneeName! } : null,
    })),
    meta: { page, pageSize: params.size, total, totalPages: Math.max(1, Math.ceil(total / params.size)) },
  };
}

export async function listAssignees(): Promise<Assignee[]> {
  return db()
    .select({ id: users.id, name: users.name, title: users.title })
    .from(users)
    .where(ne(users.role, "viewer"))
    .orderBy(asc(users.name));
}

async function userName(id: number | null) {
  if (!id) return null;
  const [u] = await db().select({ name: users.name }).from(users).where(eq(users.id, id));
  return u?.name ?? null;
}

/** Status changes also maintain closedAt, so "closed" metrics stay correct. */
function statusPatch(status: CaseStatus) {
  return { status, closedAt: status === "closed" ? new Date().toISOString() : null };
}

export async function updateCase(id: number, input: CaseUpdateInput, actor: Session) {
  return db().transaction(async (tx) => {
    const [current] = await tx.select().from(cases).where(eq(cases.id, id)).for("update");
    if (!current) return null;

    const patch: Partial<typeof cases.$inferInsert> = { ...input };
    if (input.status && input.status !== current.status) Object.assign(patch, statusPatch(input.status));

    const [updated] = await tx.update(cases).set(patch).where(eq(cases.id, id)).returning();

    // Every meaningful change is written to the timeline in the same transaction.
    const log: (typeof activities.$inferInsert)[] = [];
    const add = (type: (typeof activities.$inferInsert)["type"], message: string, meta?: Record<string, unknown>) =>
      log.push({ caseId: id, actorId: actor.userId, type, message, meta });

    if (input.status && input.status !== current.status) {
      add("status_changed", `Status changed from ${CASE_STATUS_LABELS[current.status]} to ${CASE_STATUS_LABELS[input.status]}`, {
        from: current.status,
        to: input.status,
      });
    }
    if (input.priority && input.priority !== current.priority) {
      add("priority_changed", `Priority changed to ${CASE_PRIORITY_LABELS[input.priority]}`, {
        from: current.priority,
        to: input.priority,
      });
    }
    if (input.assigneeId !== undefined && input.assigneeId !== current.assigneeId) {
      const name = await userName(input.assigneeId);
      add("assigned", name ? `Assigned to ${name}` : "Unassigned");
    }
    const otherFields = Object.keys(input).filter((k) => !["status", "priority", "assigneeId"].includes(k));
    if (otherFields.length) add("updated", `Updated ${otherFields.join(", ").replace(/([A-Z])/g, " $1").toLowerCase()}`);

    if (log.length) await tx.insert(activities).values(log);
    return updated;
  });
}

export async function deleteCase(id: number) {
  const deleted = await db().delete(cases).where(eq(cases.id, id)).returning({ id: cases.id });
  return deleted.length > 0;
}

export async function bulkUpdateCases(input: CaseBulkInput, actor: Session) {
  return db().transaction(async (tx) => {
    if (input.action === "delete") {
      const deleted = await tx.delete(cases).where(inArray(cases.id, input.ids)).returning({ id: cases.id });
      return { affected: deleted.length };
    }

    if (input.action === "set_status") {
      const changed = await tx
        .update(cases)
        .set(statusPatch(input.status))
        .where(and(inArray(cases.id, input.ids), ne(cases.status, input.status)))
        .returning({ id: cases.id });
      if (changed.length) {
        await tx.insert(activities).values(
          changed.map((c) => ({
            caseId: c.id,
            actorId: actor.userId,
            type: "status_changed" as const,
            message: `Status changed to ${CASE_STATUS_LABELS[input.status]} (bulk update)`,
            meta: { to: input.status },
          })),
        );
      }
      return { affected: changed.length };
    }

    const changed = await tx
      .update(cases)
      .set({ assigneeId: input.assigneeId })
      .where(inArray(cases.id, input.ids))
      .returning({ id: cases.id });
    const name = await userName(input.assigneeId);
    if (changed.length) {
      await tx.insert(activities).values(
        changed.map((c) => ({
          caseId: c.id,
          actorId: actor.userId,
          type: "assigned" as const,
          message: `${name ? `Assigned to ${name}` : "Unassigned"} (bulk update)`,
        })),
      );
    }
    return { affected: changed.length };
  });
}
