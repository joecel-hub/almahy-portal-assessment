"use client";

import { useMemo } from "react";
import { useForm, useWatch, type FieldValues, type Path, type UseFormSetError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField, describedBy } from "@/components/form-field";
import { HttpError } from "@/lib/api/client";
import {
  caseDetailsFormSchema,
  caseEngagementFormSchema,
  litigationCourtError,
  type CaseUpdateInput,
} from "@/lib/validation/case";
import {
  CASE_PRIORITIES,
  CASE_PRIORITY_LABELS,
  FEE_TYPES,
  FEE_TYPE_LABELS,
  type FeeType,
} from "@/lib/domain";
import type { CaseDetail } from "@/lib/cases/detail-types";
import type { Assignee } from "@/lib/cases/types";

type SaveFn = (patch: CaseUpdateInput) => Promise<unknown>;

/** Show the server's per-field messages on the form (server-side validation). */
function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: string[]) {
  if (!(error instanceof HttpError)) return;
  let matched = false;
  for (const [field, messages] of Object.entries(error.fields ?? {})) {
    if (messages?.[0] && fields.includes(field)) {
      setError(field as Path<T>, { type: "server", message: messages[0] });
      matched = true;
    }
  }
  if (!matched) setError("root.server" as Path<T>, { type: "server", message: error.message });
}

/** Keep only the fields the user actually changed, so the PATCH (and the history entry) is exact. */
function changedOnly<T extends Record<string, unknown>>(values: T, dirty: Partial<Record<keyof T, unknown>>): Partial<T> {
  return Object.fromEntries(Object.entries(values).filter(([key]) => dirty[key as keyof T])) as Partial<T>;
}

function FormActions({ pending, onCancel }: { pending: boolean; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

function RootError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

/* ------------------------------------------------------------------------ */

export function DetailsForm({ detail, save, onDone }: { detail: CaseDetail; save: SaveFn; onDone: () => void }) {
  const isLitigation = detail.practiceArea === "litigation";

  // Conditional rule: the court is required only for litigation matters.
  const schema = useMemo(
    () =>
      caseDetailsFormSchema.superRefine((v, ctx) => {
        const message = litigationCourtError(detail.practiceArea, v.courtName);
        if (message) ctx.addIssue({ code: "custom", path: ["courtName"], message });
      }),
    [detail.practiceArea],
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: detail.title,
      description: detail.description,
      dueDate: detail.dueDate ?? "",
      courtName: detail.courtName ?? "",
      opposingParty: detail.opposingParty ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const patch: CaseUpdateInput = changedOnly(values, dirtyFields);
    if (!isLitigation) {
      delete patch.courtName;
      delete patch.opposingParty;
    }
    if (Object.keys(patch).length === 0) return onDone();
    try {
      await save(patch);
      onDone();
    } catch (error) {
      applyServerErrors(error, setError, Object.keys(values));
    }
  });

  return (
    <form onSubmit={onSubmit} onKeyDown={(e) => e.key === "Escape" && onDone()} noValidate className="space-y-4">
      <RootError message={errors.root?.server?.message} />
      <FormField id="title" label="Title" required error={errors.title?.message}>
        <Input
          id="title"
          autoFocus
          aria-invalid={!!errors.title}
          aria-describedby={describedBy("title", errors.title?.message)}
          {...register("title")}
        />
      </FormField>
      <FormField id="description" label="Description" error={errors.description?.message}>
        <Textarea
          id="description"
          rows={4}
          aria-invalid={!!errors.description}
          aria-describedby={describedBy("description", errors.description?.message)}
          {...register("description")}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="dueDate" label="Due date" error={errors.dueDate?.message}>
          <Input
            id="dueDate"
            type="date"
            aria-invalid={!!errors.dueDate}
            aria-describedby={describedBy("dueDate", errors.dueDate?.message)}
            {...register("dueDate")}
          />
        </FormField>
        {isLitigation && (
          <>
            <FormField id="courtName" label="Court" required error={errors.courtName?.message}>
              <Input
                id="courtName"
                aria-invalid={!!errors.courtName}
                aria-describedby={describedBy("courtName", errors.courtName?.message)}
                {...register("courtName")}
              />
            </FormField>
            <FormField id="opposingParty" label="Opposing party" error={errors.opposingParty?.message}>
              <Input id="opposingParty" {...register("opposingParty")} />
            </FormField>
          </>
        )}
      </div>
      <FormActions pending={isSubmitting} onCancel={onDone} />
    </form>
  );
}

/* ------------------------------------------------------------------------ */

const FEE_LABEL: Record<FeeType, string> = {
  fixed: "Total fee (AED)",
  hourly: "Hourly rate (AED)",
  retainer: "Monthly retainer (AED)",
};

export function EngagementForm({
  detail,
  assignees,
  save,
  onDone,
}: {
  detail: CaseDetail;
  assignees: Assignee[];
  save: SaveFn;
  onDone: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<z.input<typeof caseEngagementFormSchema>, unknown, z.output<typeof caseEngagementFormSchema>>({
    resolver: zodResolver(caseEngagementFormSchema),
    defaultValues: {
      priority: detail.priority,
      assigneeId: detail.assignee?.id ?? "",
      feeType: detail.feeType,
      feeAmount: detail.feeAmount,
    },
  });
  // The fee field's label follows the selected fee type (conditional UI).
  const feeType = useWatch({ control, name: "feeType" }) as FeeType;

  const onSubmit = handleSubmit(async (values) => {
    const patch: CaseUpdateInput = changedOnly(values, dirtyFields);
    if (Object.keys(patch).length === 0) return onDone();
    try {
      await save(patch);
      onDone();
    } catch (error) {
      applyServerErrors(error, setError, Object.keys(values));
    }
  });

  return (
    <form onSubmit={onSubmit} onKeyDown={(e) => e.key === "Escape" && onDone()} noValidate className="space-y-4">
      <RootError message={errors.root?.server?.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="priority" label="Priority">
          <NativeSelect id="priority" autoFocus {...register("priority")}>
            {CASE_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {CASE_PRIORITY_LABELS[p]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="assigneeId" label="Assigned lawyer">
          <NativeSelect id="assigneeId" {...register("assigneeId")}>
            <option value="">Unassigned</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.title}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="feeType" label="Fee arrangement">
          <NativeSelect id="feeType" {...register("feeType")}>
            {FEE_TYPES.map((f) => (
              <option key={f} value={f}>
                {FEE_TYPE_LABELS[f]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="feeAmount" label={FEE_LABEL[feeType] ?? "Fee (AED)"} required error={errors.feeAmount?.message}>
          <Input
            id="feeAmount"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            aria-invalid={!!errors.feeAmount}
            aria-describedby={describedBy("feeAmount", errors.feeAmount?.message)}
            {...register("feeAmount")}
          />
        </FormField>
      </div>
      <FormActions pending={isSubmitting} onCancel={onDone} />
    </form>
  );
}
