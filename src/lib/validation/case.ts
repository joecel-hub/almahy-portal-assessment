import { z } from "zod";
import { CASE_PRIORITIES, CASE_STATUSES, FEE_TYPES } from "@/lib/domain";

const id = z.coerce.number().int().positive();

/** Optional text: trimmed, and an empty input is stored as null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .nullable()
    .transform((v) => v || null);

/** Optional "YYYY-MM-DD" from <input type="date">; empty becomes null. */
const optionalDate = z
  .union([z.iso.date({ message: "Use a valid date" }), z.literal("")])
  .nullable()
  .transform((v) => v || null);

/** Route param: /api/cases/[id] */
export const caseIdSchema = z.object({ id });

/**
 * Every editable case field and its rules, defined once. The detail page's
 * inline editors validate with subsets of this (instant feedback); the API
 * validates the same rules again, because the client can never be trusted.
 */
export const caseFields = {
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(160, "Keep the title under 160 characters"),
  description: z.string().trim().max(2000, "Keep the description under 2000 characters"),
  status: z.enum(CASE_STATUSES),
  priority: z.enum(CASE_PRIORITIES),
  assigneeId: id.nullable(),
  dueDate: optionalDate,
  courtName: optionalText(120),
  opposingParty: optionalText(120),
  feeType: z.enum(FEE_TYPES),
  feeAmount: z.coerce
    .number({ message: "Enter an amount" })
    .int("Use whole riyals")
    .min(0, "Fee cannot be negative")
    .max(100_000_000, "That amount is too large"),
};

/** PATCH /api/cases/[id]: any subset of the editable fields. */
export const caseUpdateSchema = z
  .object(caseFields)
  .partial()
  .strict() // unknown keys (e.g. "ref" or "clientId") are rejected, not silently ignored
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type CaseUpdateInput = z.output<typeof caseUpdateSchema>;

/** "Matter details" section on the detail page. */
export const caseDetailsFormSchema = z.object({
  title: caseFields.title,
  description: caseFields.description,
  dueDate: caseFields.dueDate,
  courtName: caseFields.courtName,
  opposingParty: caseFields.opposingParty,
});

/** "Engagement" section on the detail page. */
export const caseEngagementFormSchema = z.object({
  priority: caseFields.priority,
  assigneeId: z
    .union([id, z.literal("")])
    .transform((v) => (v === "" ? null : v)), // <select> gives "" for "Unassigned"
  feeType: caseFields.feeType,
  feeAmount: caseFields.feeAmount,
});

/** Business rule shared by the form and the service: litigation needs a court. */
export function litigationCourtError(practiceArea: string, courtName: string | null | undefined) {
  return practiceArea === "litigation" && !courtName ? "Litigation cases need a court name" : null;
}

const ids = z.array(id).min(1, "Select at least one case").max(100, "Up to 100 cases at a time");

/** POST /api/cases/bulk */
export const caseBulkSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), ids }),
  z.object({ action: z.literal("set_status"), ids, status: z.enum(CASE_STATUSES) }),
  z.object({ action: z.literal("assign"), ids, assigneeId: id.nullable() }),
]);

export type CaseBulkInput = z.infer<typeof caseBulkSchema>;
