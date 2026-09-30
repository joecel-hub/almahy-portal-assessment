import { z } from "zod";
import { CASE_PRIORITIES, CLIENT_TYPES, FEE_TYPES, PRACTICE_AREAS } from "@/lib/domain";
import { caseFields, litigationCourtError } from "./case";

/**
 * POST /api/cases: the "New case" wizard's payload, one object per step.
 * The wizard validates each step with its slice of this schema before moving
 * on; the API validates the whole thing again on submit.
 */

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .optional()
    .transform((v) => v || undefined);

// Step 1: pick an existing client, or register a new one.
const existingClient = z.object({
  mode: z.literal("existing"),
  clientId: z.coerce.number({ message: "Choose a client" }).int().positive("Choose a client"),
});

const newClient = z
  .object({
    mode: z.literal("new"),
    type: z.enum(CLIENT_TYPES),
    name: z.string().trim().min(2, "Enter the client's name").max(120),
    contactName: optional(120),
    tradeLicense: optional(40),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s-]{7,20}$/, "Enter a valid phone number, e.g. +971 50 123 4567"),
    city: z.string().trim().min(2, "Enter the city").max(60),
  })
  // Conditional fields: companies must provide a contact person and trade licence.
  .superRefine((c, ctx) => {
    if (c.type !== "company") return;
    if (!c.contactName) ctx.addIssue({ code: "custom", path: ["contactName"], message: "Enter a contact person" });
    if (!c.tradeLicense) ctx.addIssue({ code: "custom", path: ["tradeLicense"], message: "Enter the trade licence number" });
  });

export const clientStepSchema = z.discriminatedUnion("mode", [existingClient, newClient]);

// Step 2: the matter itself.
export const matterStepSchema = z
  .object({
    title: caseFields.title,
    practiceArea: z.enum(PRACTICE_AREAS, { message: "Choose a practice area" }),
    priority: z.enum(CASE_PRIORITIES),
    description: caseFields.description,
    dueDate: caseFields.dueDate,
    courtName: caseFields.courtName,
    opposingParty: caseFields.opposingParty,
  })
  // Conditional fields: litigation needs a court; other areas drop court fields.
  .superRefine((m, ctx) => {
    const message = litigationCourtError(m.practiceArea, m.courtName);
    if (message) ctx.addIssue({ code: "custom", path: ["courtName"], message });
  })
  .transform((m) =>
    m.practiceArea === "litigation" ? m : { ...m, courtName: null, opposingParty: null },
  );

// Step 3: fees and who handles it.
export const engagementStepSchema = z.object({
  feeType: z.enum(FEE_TYPES),
  feeAmount: caseFields.feeAmount.refine((n) => n > 0, "Enter a fee greater than zero"),
  assigneeId: z.union([z.coerce.number().int().positive(), z.literal("")]).transform((v) => (v === "" ? null : v)),
});

export const caseCreateSchema = z.object({
  client: clientStepSchema,
  matter: matterStepSchema,
  engagement: engagementStepSchema,
});

export type CaseCreateFormValues = z.input<typeof caseCreateSchema>;
export type CaseCreateInput = z.output<typeof caseCreateSchema>;
