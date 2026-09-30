import { z } from "zod";
import { CASE_PRIORITIES, CASE_STATUSES, FEE_TYPES } from "@/lib/domain";

const id = z.coerce.number().int().positive();
const isoDate = z.iso.date({ message: "Use a valid date" });

/** Route param: /api/cases/[id] */
export const caseIdSchema = z.object({ id });

/**
 * PATCH /api/cases/[id]: any subset of the editable fields.
 * Shared by the detail page's inline editors (client validation) and the API
 * (server validation), so both always agree.
 */
export const caseUpdateSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(160),
    description: z.string().trim().max(2000),
    status: z.enum(CASE_STATUSES),
    priority: z.enum(CASE_PRIORITIES),
    assigneeId: id.nullable(),
    dueDate: isoDate.nullable(),
    courtName: z.string().trim().max(120).nullable(),
    opposingParty: z.string().trim().max(120).nullable(),
    feeType: z.enum(FEE_TYPES),
    feeAmount: z.coerce.number().int().min(0, "Fee cannot be negative").max(100_000_000),
  })
  .partial()
  .strict() // unknown keys (e.g. "ref" or "clientId") are rejected, not silently ignored
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type CaseUpdateInput = z.infer<typeof caseUpdateSchema>;

const ids = z.array(id).min(1, "Select at least one case").max(100, "Up to 100 cases at a time");

/** POST /api/cases/bulk */
export const caseBulkSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), ids }),
  z.object({ action: z.literal("set_status"), ids, status: z.enum(CASE_STATUSES) }),
  z.object({ action: z.literal("assign"), ids, assigneeId: id.nullable() }),
]);

export type CaseBulkInput = z.infer<typeof caseBulkSchema>;
