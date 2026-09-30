/**
 * Seeds the database with deterministic, fictional demo data.
 *
 *   npm run db:push   # create/update tables from schema.ts
 *   npm run db:seed   # wipe and re-seed
 *
 * Faker is seeded with a fixed number, so every run produces the same data.
 * Demo account passwords come from SEED_DEMO_PASSWORD, never from the repo.
 */
import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import { addDays, subDays, subMonths } from "date-fns";
import * as schema from "./schema";
import {
  CASE_PRIORITIES,
  CONSULTATION_MODES,
  DOCUMENT_KINDS,
  PRACTICE_AREAS,
  CASE_STATUS_LABELS,
  type CaseStatus,
  type PracticeArea,
} from "../../lib/domain";

config({ path: ".env.local", quiet: true });

const { DATABASE_URL, SEED_DEMO_PASSWORD } = process.env;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set (see .env.example).");
if (!SEED_DEMO_PASSWORD || SEED_DEMO_PASSWORD.length < 8) {
  throw new Error("SEED_DEMO_PASSWORD must be set and at least 8 characters (see .env.example).");
}

faker.seed(20260930);
const NOW = new Date();

const FIRST_NAMES = [
  "Omar", "Layla", "Yousef", "Nour", "Khalid", "Sara", "Hassan", "Mariam", "Faisal", "Huda",
  "Tariq", "Rania", "Ziad", "Dina", "Karim", "Salma", "Adel", "Lina", "Majed", "Reem",
];
const LAST_NAMES = [
  "Al-Harbi", "Haddad", "Mansour", "Al-Qahtani", "Nasser", "Saleh", "Farouk", "Al-Otaibi",
  "Khalil", "Rahman", "Al-Shammari", "Aziz", "Hamdan", "Al-Zahrani", "Sabbagh", "Darwish",
];
const COMPANY_SUFFIXES = ["Holdings", "Trading Co.", "Group", "Logistics", "Real Estate", "Contracting", "Ventures", "Industries"];
const CITIES = ["Riyadh", "Jeddah", "Dammam", "Mecca", "Medina", "Khobar", "Tabuk", "Abha"];
const COURTS = ["General Court", "Commercial Court", "Labour Court", "Court of Appeal", "Personal Status Court"];

const TITLE_TEMPLATES: Record<PracticeArea, string[]> = {
  corporate: ["Shareholder agreement review", "Company formation", "Merger due diligence", "Board governance advisory", "Joint venture structuring"],
  litigation: ["Breach of contract claim", "Debt recovery action", "Commercial dispute", "Appeal against judgment", "Partnership dispute"],
  real_estate: ["Lease agreement drafting", "Property acquisition", "Title transfer", "Construction contract dispute", "Off-plan sale review"],
  employment: ["Wrongful termination claim", "Employment contract review", "End-of-service settlement", "HR policy compliance", "Non-compete enforcement"],
  family: ["Inheritance distribution", "Custody arrangement", "Marriage contract review", "Estate planning", "Guardianship application"],
  intellectual_property: ["Trademark registration", "Copyright infringement", "Licensing agreement", "Patent filing support", "Brand dispute"],
};

const NOTES = [
  "Client call: agreed to share the signed engagement letter by end of week.",
  "Reviewed the draft agreement; flagged the limitation-of-liability clause.",
  "Requested certified copies of the commercial registration.",
  "Opposing counsel proposed a settlement meeting; awaiting client instructions.",
  "Hearing date confirmed with the court registry.",
  "Sent the first draft to the client for comments.",
  "Client provided additional evidence; added to the case file.",
  "Internal review with the partner; strategy approved.",
  "Invoice issued for the current billing period.",
  "Translation of supporting documents requested.",
  "Follow-up email sent regarding outstanding documents.",
  "Research memo on applicable precedents completed.",
];
const DESCRIPTIONS = [
  "The client seeks advice and representation on this matter. Initial documents have been received and a preliminary assessment is under way.",
  "Engagement covers review of the relevant agreements, advice on the client's position and, if needed, negotiation with the other party.",
  "Matter opened following an initial consultation. Scope, fees and timeline were agreed in the engagement letter.",
  "The firm will prepare the required filings, coordinate with the relevant authority and keep the client informed of each step.",
  "Advisory engagement: identify risks, recommend options and draft the necessary documentation for the client's approval.",
];

const pick = <T,>(items: readonly T[]) => faker.helpers.arrayElement(items);
const fullName = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
const iso = (d: Date) => d.toISOString();

async function main() {
  const client = postgres(DATABASE_URL!, { prepare: false, max: 1 });
  const db = drizzle({ client, schema, casing: "snake_case" });

  console.log("Clearing existing data…");
  await db.execute(
    sql`TRUNCATE activities, documents, consultations, cases, clients, users RESTART IDENTITY CASCADE`,
  );

  // Users: one account per role for reviewers, plus extra case managers so
  // assignment and filtering have variety.
  const passwordHash = await bcrypt.hash(SEED_DEMO_PASSWORD!, 10);
  const users = await db
    .insert(schema.users)
    .values([
      { name: "Layla Haddad", email: "admin@almahy.demo", role: "admin", title: "Managing Partner", passwordHash },
      { name: "Omar Al-Harbi", email: "manager@almahy.demo", role: "manager", title: "Senior Associate", passwordHash },
      { name: "Sara Mansour", email: "viewer@almahy.demo", role: "viewer", title: "Paralegal", passwordHash },
      { name: "Khalid Nasser", email: "khalid@almahy.demo", role: "manager", title: "Associate", passwordHash },
      { name: "Rania Saleh", email: "rania@almahy.demo", role: "manager", title: "Associate", passwordHash },
      { name: "Faisal Khalil", email: "faisal@almahy.demo", role: "manager", title: "Counsel", passwordHash },
    ])
    .returning();
  const lawyers = users.filter((u) => u.role !== "viewer");

  console.log("Seeding clients…");
  const clientRows = Array.from({ length: 140 }, () => {
    const isCompany = faker.number.float() < 0.45;
    const last = pick(LAST_NAMES);
    const name = isCompany ? `${last.replace("Al-", "")} ${pick(COMPANY_SUFFIXES)}` : fullName();
    const slug = name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
    return {
      type: isCompany ? ("company" as const) : ("individual" as const),
      name,
      contactName: isCompany ? fullName() : null,
      crNumber: isCompany ? faker.string.numeric(10) : null,
      email: `${slug}@example.com`,
      phone: `+966 5${faker.string.numeric(1)} ${faker.string.numeric(3)} ${faker.string.numeric(4)}`,
      city: pick(CITIES),
      createdAt: iso(faker.date.between({ from: subMonths(NOW, 16), to: subMonths(NOW, 1) })),
    };
  });
  const clients = await db.insert(schema.clients).values(clientRows).returning();

  console.log("Seeding cases…");
  const caseRows = Array.from({ length: 360 }, (_, i) => {
    const practiceArea = pick(PRACTICE_AREAS);
    const openedAt = faker.date.between({ from: subMonths(NOW, 14), to: NOW });
    const ageDays = (NOW.getTime() - openedAt.getTime()) / 86_400_000;
    // Older cases are more likely to be closed, which makes the charts realistic.
    const status: CaseStatus =
      ageDays > 120 && faker.number.float() < 0.7
        ? "closed"
        : faker.helpers.weightedArrayElement([
            { value: "intake", weight: ageDays < 20 ? 4 : 1 },
            { value: "open", weight: 3 },
            { value: "in_progress", weight: 4 },
            { value: "on_hold", weight: 1 },
            { value: "closed", weight: 2 },
          ]);
    const closedAt =
      status === "closed" ? addDays(openedAt, faker.number.int({ min: 7, max: Math.max(8, Math.floor(ageDays)) })) : null;
    const feeType = faker.helpers.weightedArrayElement([
      { value: "fixed" as const, weight: 5 },
      { value: "hourly" as const, weight: 3 },
      { value: "retainer" as const, weight: 2 },
    ]);
    const feeAmount =
      feeType === "hourly"
        ? faker.number.int({ min: 6, max: 15 }) * 100
        : feeType === "retainer"
          ? faker.number.int({ min: 8, max: 40 }) * 1000
          : faker.number.int({ min: 5, max: 150 }) * 1000;
    const client = pick(clients);
    return {
      ref: `ALM-${openedAt.getFullYear()}-${String(i + 1).padStart(4, "0")}`,
      title: `${pick(TITLE_TEMPLATES[practiceArea])} – ${client.name}`,
      description: pick(DESCRIPTIONS),
      clientId: client.id,
      practiceArea,
      status,
      priority: faker.helpers.weightedArrayElement(
        CASE_PRIORITIES.map((p, idx) => ({ value: p, weight: [3, 5, 3, 1][idx] })),
      ),
      assigneeId: faker.number.float() < 0.92 ? pick(lawyers).id : null,
      courtName: practiceArea === "litigation" ? `${pick(CITIES)} ${pick(COURTS)}` : null,
      opposingParty: practiceArea === "litigation" ? `${pick(LAST_NAMES).replace("Al-", "")} ${pick(COMPANY_SUFFIXES)}` : null,
      feeType,
      feeAmount,
      openedAt: iso(openedAt),
      dueDate: status === "closed" ? null : addDays(NOW, faker.number.int({ min: -10, max: 120 })).toISOString().slice(0, 10),
      closedAt: closedAt ? iso(closedAt > NOW ? NOW : closedAt) : null,
    };
  });
  const cases = await db.insert(schema.cases).values(caseRows).returning();

  console.log("Seeding consultations, documents and activity…");
  const consultationRows: (typeof schema.consultations.$inferInsert)[] = [];
  const documentRows: (typeof schema.documents.$inferInsert)[] = [];
  const activityRows: (typeof schema.activities.$inferInsert)[] = [];

  for (const c of cases) {
    const opened = new Date(c.openedAt);
    const end = c.closedAt ? new Date(c.closedAt) : NOW;
    const between = () => faker.date.between({ from: opened, to: end > opened ? end : addDays(opened, 1) });
    const actor = () => (c.assigneeId ?? pick(lawyers).id);

    activityRows.push({
      caseId: c.id, actorId: users[0].id, type: "created",
      message: `Case ${c.ref} opened`, createdAt: c.openedAt,
    });
    if (c.assigneeId) {
      activityRows.push({
        caseId: c.id, actorId: users[0].id, type: "assigned",
        message: `Assigned to ${users.find((u) => u.id === c.assigneeId)?.name}`,
        createdAt: iso(addDays(opened, 1)),
      });
    }

    for (let n = faker.number.int({ min: 0, max: 3 }); n > 0; n--) {
      const kind = pick(DOCUMENT_KINDS);
      const at = between();
      documentRows.push({
        caseId: c.id, kind, uploadedById: actor(), uploadedAt: iso(at),
        name: `${c.ref}-${kind}-${faker.string.alphanumeric(4).toLowerCase()}.pdf`,
        sizeKb: faker.number.int({ min: 40, max: 4800 }),
      });
      activityRows.push({
        caseId: c.id, actorId: actor(), type: "document_added",
        message: `Uploaded a ${kind} document`, createdAt: iso(at),
      });
    }

    for (let n = faker.number.int({ min: 0, max: 2 }); n > 0; n--) {
      const at = between();
      activityRows.push({ caseId: c.id, actorId: actor(), type: "note", message: pick(NOTES), createdAt: iso(at) });
    }

    if (c.status !== "intake") {
      activityRows.push({
        caseId: c.id, actorId: actor(), type: "status_changed",
        message: `Status changed to ${CASE_STATUS_LABELS[c.status]}`,
        meta: { to: c.status }, createdAt: c.closedAt ?? iso(between()),
      });
    }

    // Consultations: past ones are mostly completed; a slice are in the upcoming weeks.
    for (let n = faker.number.int({ min: 0, max: 2 }); n > 0; n--) {
      const upcoming = c.status !== "closed" && faker.number.float() < 0.3;
      const at = upcoming ? faker.date.between({ from: NOW, to: addDays(NOW, 30) }) : between();
      consultationRows.push({
        clientId: c.clientId, caseId: c.id, lawyerId: c.assigneeId ?? pick(lawyers).id,
        subject: faker.helpers.arrayElement(["Initial consultation", "Case strategy review", "Settlement discussion", "Document review", "Hearing preparation"]),
        scheduledAt: iso(at), mode: pick(CONSULTATION_MODES),
        status: upcoming ? "scheduled" : faker.helpers.weightedArrayElement([
          { value: "completed" as const, weight: 8 }, { value: "cancelled" as const, weight: 1 }, { value: "no_show" as const, weight: 1 },
        ]),
      });
    }
  }

  // Standalone consultations with prospective clients (no case yet).
  for (let n = 0; n < 40; n++) {
    const upcoming = faker.number.float() < 0.4;
    consultationRows.push({
      clientId: pick(clients).id, caseId: null, lawyerId: pick(lawyers).id, subject: "Initial consultation",
      scheduledAt: iso(upcoming ? faker.date.between({ from: NOW, to: addDays(NOW, 21) }) : faker.date.between({ from: subDays(NOW, 400), to: NOW })),
      mode: pick(CONSULTATION_MODES), status: upcoming ? "scheduled" : "completed",
    });
  }

  // Insert in chunks to stay well below Postgres' bind-parameter limit.
  const chunked = async <T,>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) => {
    for (let i = 0; i < rows.length; i += 500) await insert(rows.slice(i, i + 500));
  };
  await chunked(consultationRows, (r) => db.insert(schema.consultations).values(r));
  await chunked(documentRows, (r) => db.insert(schema.documents).values(r));
  await chunked(activityRows, (r) => db.insert(schema.activities).values(r));

  console.log(
    `Done: ${users.length} users, ${clients.length} clients, ${cases.length} cases, ` +
      `${consultationRows.length} consultations, ${documentRows.length} documents, ${activityRows.length} activities.`,
  );
  console.log("Demo logins: admin@almahy.demo, manager@almahy.demo, viewer@almahy.demo (password = SEED_DEMO_PASSWORD)");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
