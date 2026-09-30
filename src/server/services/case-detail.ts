import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/server/db";
import { activities, cases, clients, consultations, documents, users } from "@/server/db/schema";
import type { CaseDetail } from "@/lib/cases/detail-types";

/**
 * Loads a case and its related records. The case row is fetched first (to
 * 404 early); the five related lists are independent, so they run in parallel.
 */
export async function getCaseDetail(id: number): Promise<CaseDetail | null> {
  const [row] = await db()
    .select({
      case: cases,
      client: {
        id: clients.id,
        type: clients.type,
        name: clients.name,
        contactName: clients.contactName,
        crNumber: clients.crNumber,
        email: clients.email,
        phone: clients.phone,
        city: clients.city,
      },
      assignee: { id: users.id, name: users.name, title: users.title },
    })
    .from(cases)
    .innerJoin(clients, eq(cases.clientId, clients.id))
    .leftJoin(users, eq(cases.assigneeId, users.id))
    .where(eq(cases.id, id));
  if (!row) return null;

  const [consultationRows, documentRows, activityRows, relatedCases] = await Promise.all([
    db()
      .select({
        id: consultations.id,
        subject: consultations.subject,
        scheduledAt: consultations.scheduledAt,
        mode: consultations.mode,
        status: consultations.status,
        lawyerName: users.name,
      })
      .from(consultations)
      .leftJoin(users, eq(consultations.lawyerId, users.id))
      .where(eq(consultations.caseId, id))
      .orderBy(desc(consultations.scheduledAt)),
    db()
      .select({
        id: documents.id,
        name: documents.name,
        kind: documents.kind,
        sizeKb: documents.sizeKb,
        uploadedAt: documents.uploadedAt,
        uploadedBy: users.name,
      })
      .from(documents)
      .leftJoin(users, eq(documents.uploadedById, users.id))
      .where(eq(documents.caseId, id))
      .orderBy(desc(documents.uploadedAt)),
    db()
      .select({
        id: activities.id,
        type: activities.type,
        message: activities.message,
        createdAt: activities.createdAt,
        actorName: users.name,
      })
      .from(activities)
      .leftJoin(users, eq(activities.actorId, users.id))
      .where(eq(activities.caseId, id))
      .orderBy(desc(activities.createdAt), desc(activities.id))
      .limit(50),
    db()
      .select({ id: cases.id, ref: cases.ref, title: cases.title, status: cases.status, openedAt: cases.openedAt })
      .from(cases)
      .where(and(eq(cases.clientId, row.client.id), ne(cases.id, id)))
      .orderBy(desc(cases.openedAt))
      .limit(5),
  ]);

  const c = row.case;
  return {
    id: c.id,
    ref: c.ref,
    title: c.title,
    description: c.description,
    status: c.status,
    priority: c.priority,
    practiceArea: c.practiceArea,
    courtName: c.courtName,
    opposingParty: c.opposingParty,
    feeType: c.feeType,
    feeAmount: c.feeAmount,
    openedAt: c.openedAt,
    dueDate: c.dueDate,
    closedAt: c.closedAt,
    updatedAt: c.updatedAt,
    assignee: row.assignee,
    client: row.client,
    consultations: consultationRows,
    documents: documentRows,
    activity: activityRows,
    relatedCases,
  };
}
