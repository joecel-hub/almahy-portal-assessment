import "server-only";
import { cache } from "react";
import { and, asc, count, desc, eq, gte, ilike, lt, or, type SQL } from "drizzle-orm";
import { db } from "@/server/db";
import { cases, clients, consultations, documents, users } from "@/server/db/schema";
import {
  LIST_PAGE_SIZE,
  type ClientListParams,
  type ConsultationListParams,
  type DocumentListParams,
} from "@/lib/lists/search-params";
import type { PageMeta } from "@/lib/api/types";

/** Read services for the Clients, Consultations and Documents pages. */

const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const pageOf = (page: number) => Math.max(1, page);
const meta = (page: number, total: number): PageMeta => ({
  page,
  pageSize: LIST_PAGE_SIZE,
  total,
  totalPages: Math.max(1, Math.ceil(total / LIST_PAGE_SIZE)),
});

export async function listClients(p: ClientListParams) {
  const filters: SQL[] = [];
  if (p.q.trim()) {
    const pattern = `%${likeEscape(p.q.trim())}%`;
    filters.push(or(ilike(clients.name, pattern), ilike(clients.email, pattern), ilike(clients.city, pattern))!);
  }
  if (p.type) filters.push(eq(clients.type, p.type));
  const where = filters.length ? and(...filters) : undefined;
  const page = pageOf(p.page);

  const caseCount = db()
    .select({ clientId: cases.clientId, total: count().as("total") })
    .from(cases)
    .groupBy(cases.clientId)
    .as("case_count");

  const [rows, [{ total }]] = await Promise.all([
    db()
      .select({
        id: clients.id,
        name: clients.name,
        type: clients.type,
        contactName: clients.contactName,
        email: clients.email,
        phone: clients.phone,
        city: clients.city,
        createdAt: clients.createdAt,
        cases: caseCount.total,
      })
      .from(clients)
      .leftJoin(caseCount, eq(caseCount.clientId, clients.id))
      .where(where)
      .orderBy(asc(clients.name), asc(clients.id))
      .limit(LIST_PAGE_SIZE)
      .offset((page - 1) * LIST_PAGE_SIZE),
    db().select({ total: count() }).from(clients).where(where),
  ]);
  return { data: rows.map((r) => ({ ...r, cases: Number(r.cases ?? 0) })), meta: meta(page, total) };
}

export const getClient = cache(async (id: number) => {
  const [client] = await db().select().from(clients).where(eq(clients.id, id));
  if (!client) return null;
  const [clientCases, clientConsultations] = await Promise.all([
    db()
      .select({
        id: cases.id,
        ref: cases.ref,
        title: cases.title,
        status: cases.status,
        practiceArea: cases.practiceArea,
        feeAmount: cases.feeAmount,
        feeType: cases.feeType,
        openedAt: cases.openedAt,
      })
      .from(cases)
      .where(eq(cases.clientId, id))
      .orderBy(desc(cases.openedAt)),
    db()
      .select({
        id: consultations.id,
        subject: consultations.subject,
        scheduledAt: consultations.scheduledAt,
        status: consultations.status,
        mode: consultations.mode,
      })
      .from(consultations)
      .where(eq(consultations.clientId, id))
      .orderBy(desc(consultations.scheduledAt))
      .limit(10),
  ]);
  return { ...client, cases: clientCases, consultations: clientConsultations };
});

export async function listConsultations(p: ConsultationListParams) {
  const now = new Date().toISOString();
  const filters: SQL[] = [p.when === "upcoming" ? gte(consultations.scheduledAt, now) : lt(consultations.scheduledAt, now)];
  if (p.status) filters.push(eq(consultations.status, p.status));
  const where = and(...filters);
  const page = pageOf(p.page);

  const [rows, [{ total }]] = await Promise.all([
    db()
      .select({
        id: consultations.id,
        subject: consultations.subject,
        scheduledAt: consultations.scheduledAt,
        mode: consultations.mode,
        status: consultations.status,
        clientId: clients.id,
        clientName: clients.name,
        caseId: cases.id,
        caseRef: cases.ref,
        lawyerName: users.name,
      })
      .from(consultations)
      .innerJoin(clients, eq(consultations.clientId, clients.id))
      .leftJoin(cases, eq(consultations.caseId, cases.id))
      .leftJoin(users, eq(consultations.lawyerId, users.id))
      .where(where)
      // Upcoming: soonest first. Past: most recent first.
      .orderBy(p.when === "upcoming" ? asc(consultations.scheduledAt) : desc(consultations.scheduledAt), asc(consultations.id))
      .limit(LIST_PAGE_SIZE)
      .offset((page - 1) * LIST_PAGE_SIZE),
    db().select({ total: count() }).from(consultations).where(where),
  ]);
  return { data: rows, meta: meta(page, total) };
}

export async function listDocuments(p: DocumentListParams) {
  const filters: SQL[] = [];
  if (p.q.trim()) {
    const pattern = `%${likeEscape(p.q.trim())}%`;
    filters.push(or(ilike(documents.name, pattern), ilike(cases.ref, pattern))!);
  }
  if (p.kind) filters.push(eq(documents.kind, p.kind));
  const where = filters.length ? and(...filters) : undefined;
  const page = pageOf(p.page);

  const [rows, [{ total }]] = await Promise.all([
    db()
      .select({
        id: documents.id,
        name: documents.name,
        kind: documents.kind,
        sizeKb: documents.sizeKb,
        uploadedAt: documents.uploadedAt,
        uploadedBy: users.name,
        caseId: cases.id,
        caseRef: cases.ref,
        caseTitle: cases.title,
      })
      .from(documents)
      .innerJoin(cases, eq(documents.caseId, cases.id))
      .leftJoin(users, eq(documents.uploadedById, users.id))
      .where(where)
      .orderBy(desc(documents.uploadedAt), desc(documents.id))
      .limit(LIST_PAGE_SIZE)
      .offset((page - 1) * LIST_PAGE_SIZE),
    db().select({ total: count() }).from(documents).innerJoin(cases, eq(documents.caseId, cases.id)).where(where),
  ]);
  return { data: rows, meta: meta(page, total) };
}

export async function listTeam() {
  return db()
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, title: users.title })
    .from(users)
    .orderBy(asc(users.name));
}
