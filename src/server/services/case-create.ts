import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { activities, cases, clients, users } from "@/server/db/schema";
import { ApiError } from "@/server/api/route";
import type { CaseCreateInput } from "@/lib/validation/case-create";
import type { Session } from "@/lib/auth/token";
import type { ClientOption } from "@/lib/cases/types";

export async function listClientOptions(): Promise<ClientOption[]> {
  return db()
    .select({ id: clients.id, name: clients.name, type: clients.type, city: clients.city })
    .from(clients)
    .orderBy(asc(clients.name));
}

/**
 * Creates the case (and the client, if new) in one transaction: either both
 * rows and the first timeline entry exist, or none do.
 */
export async function createCase(input: CaseCreateInput, actor: Session) {
  return db().transaction(async (tx) => {
    let clientId: number;
    if (input.client.mode === "existing") {
      const [existing] = await tx
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, input.client.clientId));
      if (!existing) {
        throw new ApiError(400, "validation_error", "That client no longer exists", {
          "client.clientId": ["That client no longer exists"],
        });
      }
      clientId = existing.id;
    } else {
      const c = input.client;
      const [created] = await tx
        .insert(clients)
        .values({
          type: c.type,
          name: c.name,
          contactName: c.type === "company" ? c.contactName : null,
          crNumber: c.type === "company" ? c.tradeLicense : null,
          email: c.email,
          phone: c.phone,
          city: c.city,
        })
        .returning({ id: clients.id });
      clientId = created.id;
    }

    if (input.engagement.assigneeId) {
      const [lawyer] = await tx.select({ role: users.role }).from(users).where(eq(users.id, input.engagement.assigneeId));
      if (!lawyer || lawyer.role === "viewer") {
        throw new ApiError(400, "validation_error", "Choose a lawyer who can handle cases", {
          "engagement.assigneeId": ["Choose a lawyer who can handle cases"],
        });
      }
    }

    // The reference is derived from the generated id, so two people creating
    // cases at the same moment can never get the same number.
    const [row] = await tx
      .insert(cases)
      .values({
        ref: `PENDING-${crypto.randomUUID()}`,
        title: input.matter.title,
        description: input.matter.description,
        clientId,
        practiceArea: input.matter.practiceArea,
        priority: input.matter.priority,
        status: "intake",
        dueDate: input.matter.dueDate,
        courtName: input.matter.courtName,
        opposingParty: input.matter.opposingParty,
        feeType: input.engagement.feeType,
        feeAmount: input.engagement.feeAmount,
        assigneeId: input.engagement.assigneeId,
      })
      .returning({ id: cases.id });

    const [created] = await tx
      .update(cases)
      .set({ ref: sql`'ALM-' || extract(year from now())::int || '-' || lpad(${row.id}::text, 4, '0')` })
      .where(eq(cases.id, row.id))
      .returning({ id: cases.id, ref: cases.ref });

    await tx.insert(activities).values({
      caseId: created.id,
      actorId: actor.userId,
      type: "created",
      message: `Case ${created.ref} opened`,
    });

    return created;
  });
}
