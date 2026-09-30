import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import {
  ACTIVITY_TYPES,
  CASE_PRIORITIES,
  CASE_STATUSES,
  CLIENT_TYPES,
  CONSULTATION_MODES,
  CONSULTATION_STATUSES,
  DOCUMENT_KINDS,
  FEE_TYPES,
  PRACTICE_AREAS,
  ROLES,
} from "../../lib/domain";

// Postgres enums are built from the same tuples the UI and validation use.
export const roleEnum = pgEnum("role", ROLES);
export const clientTypeEnum = pgEnum("client_type", CLIENT_TYPES);
export const caseStatusEnum = pgEnum("case_status", CASE_STATUSES);
export const casePriorityEnum = pgEnum("case_priority", CASE_PRIORITIES);
export const practiceAreaEnum = pgEnum("practice_area", PRACTICE_AREAS);
export const feeTypeEnum = pgEnum("fee_type", FEE_TYPES);
export const consultationModeEnum = pgEnum("consultation_mode", CONSULTATION_MODES);
export const consultationStatusEnum = pgEnum("consultation_status", CONSULTATION_STATUSES);
export const documentKindEnum = pgEnum("document_kind", DOCUMENT_KINDS);
export const activityTypeEnum = pgEnum("activity_type", ACTIVITY_TYPES);

// Timestamps come back as ISO strings (mode: "string") so the same value shape
// flows through Server Components, JSON API responses and the client cache.
const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow();

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  email: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum().notNull().default("viewer"),
  title: text().notNull().default(""),
  createdAt: createdAt(),
});

export const clients = pgTable(
  "clients",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    type: clientTypeEnum().notNull(),
    /** Person's full name, or the registered company name. */
    name: text().notNull(),
    /** Company only: main contact at the company. */
    contactName: text("contact_name"),
    /** Company only: trade licence number (column name kept from the first schema). */
    crNumber: text("cr_number"),
    email: text().notNull(),
    phone: text().notNull(),
    city: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("clients_name_idx").on(t.name)],
);

export const cases = pgTable(
  "cases",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ref: text().notNull().unique(),
    title: text().notNull(),
    description: text().notNull().default(""),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    practiceArea: practiceAreaEnum("practice_area").notNull(),
    status: caseStatusEnum().notNull().default("intake"),
    priority: casePriorityEnum().notNull().default("medium"),
    assigneeId: integer("assignee_id").references(() => users.id, { onDelete: "set null" }),
    /** Litigation only. */
    courtName: text("court_name"),
    /** Litigation only. */
    opposingParty: text("opposing_party"),
    feeType: feeTypeEnum("fee_type").notNull().default("fixed"),
    /** Whole AED. Fixed: total fee. Hourly: rate per hour. Retainer: monthly amount. */
    feeAmount: integer("fee_amount").notNull().default(0),
    openedAt: timestamp("opened_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    dueDate: date("due_date", { mode: "string" }),
    closedAt: timestamp("closed_at", { withTimezone: true, mode: "string" }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  // Indexes match the list page's filters and the dashboard's date-range queries.
  (t) => [
    index("cases_status_idx").on(t.status),
    index("cases_priority_idx").on(t.priority),
    index("cases_practice_area_idx").on(t.practiceArea),
    index("cases_opened_at_idx").on(t.openedAt),
    index("cases_client_idx").on(t.clientId),
  ],
);

export const consultations = pgTable(
  "consultations",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    caseId: integer("case_id").references(() => cases.id, { onDelete: "set null" }),
    lawyerId: integer("lawyer_id").references(() => users.id, { onDelete: "set null" }),
    subject: text().notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "string" }).notNull(),
    mode: consultationModeEnum().notNull(),
    status: consultationStatusEnum().notNull().default("scheduled"),
  },
  (t) => [
    index("consultations_scheduled_at_idx").on(t.scheduledAt),
    index("consultations_case_idx").on(t.caseId),
    index("consultations_client_idx").on(t.clientId),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    caseId: integer("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    name: text().notNull(),
    kind: documentKindEnum().notNull(),
    sizeKb: integer("size_kb").notNull(),
    uploadedById: integer("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [index("documents_case_idx").on(t.caseId)],
);

/** Append-only history that powers the case timeline. */
export const activities = pgTable(
  "activities",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    caseId: integer("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
    type: activityTypeEnum().notNull(),
    message: text().notNull(),
    meta: jsonb().$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("activities_case_created_idx").on(t.caseId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type Consultation = typeof consultations.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Activity = typeof activities.$inferSelect;
