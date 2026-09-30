"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useForm, useWatch, type FieldPath, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CloudUpload,
  Loader2,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField, describedBy } from "@/components/form-field";
import { useSession } from "@/components/session-provider";
import { api, HttpError } from "@/lib/api/client";
import { caseKeys } from "@/lib/cases/query-keys";
import { caseCreateSchema, type CaseCreateInput } from "@/lib/validation/case-create";
import {
  CASE_PRIORITIES,
  CASE_PRIORITY_LABELS,
  CLIENT_TYPE_LABELS,
  FEE_TYPES,
  FEE_TYPE_LABELS,
  PRACTICE_AREAS,
  PRACTICE_AREA_LABELS,
  type ClientType,
  type FeeType,
} from "@/lib/domain";
import { formatCurrency, formatDateTime, formatPlainDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Assignee, ClientOption } from "@/lib/cases/types";
import { clearDraft, loadDraft, saveDraft } from "./draft";

/**
 * What the form holds while the user types: raw input strings for every field
 * of every branch. The Zod schema turns this into the typed API payload
 * (coercing numbers, dropping fields of the branch not chosen).
 */
type WizardValues = {
  client: {
    mode: "existing" | "new";
    clientId: string;
    type: ClientType;
    name: string;
    contactName: string;
    tradeLicense: string;
    email: string;
    phone: string;
    city: string;
  };
  matter: {
    title: string;
    practiceArea: string;
    priority: string;
    description: string;
    dueDate: string;
    courtName: string;
    opposingParty: string;
  };
  engagement: { feeType: FeeType; feeAmount: string; assigneeId: string };
};

const EMPTY: WizardValues = {
  client: { mode: "existing", clientId: "", type: "individual", name: "", contactName: "", tradeLicense: "", email: "", phone: "", city: "Dubai" },
  matter: { title: "", practiceArea: "", priority: "medium", description: "", dueDate: "", courtName: "", opposingParty: "" },
  engagement: { feeType: "fixed", feeAmount: "", assigneeId: "" },
};

const STEPS = [
  { key: "client", title: "Client", description: "Who is the case for?" },
  { key: "matter", title: "Matter", description: "What is the case about?" },
  { key: "engagement", title: "Engagement", description: "Fees and the responsible lawyer." },
  { key: "review", title: "Review", description: "Check everything before creating the case." },
] as const;
const LAST_STEP = STEPS.length - 1;
type SectionKey = "client" | "matter" | "engagement";
const stepOf = (path: string) => Math.max(0, STEPS.findIndex((s) => path.startsWith(s.key)));

const FEE_LABEL: Record<FeeType, string> = {
  fixed: "Total fee (AED)",
  hourly: "Hourly rate (AED)",
  retainer: "Monthly retainer (AED)",
};

type Props = { clients: ClientOption[]; assignees: Assignee[] };

export function NewCaseWizard({ clients, assignees }: Props) {
  const session = useSession();
  const queryClient = useQueryClient();

  // Loaded only in the browser (the wizard is rendered with ssr: false), so
  // reading localStorage during the first render cannot cause a hydration mismatch.
  const [restored, setRestored] = useState(() => loadDraft<WizardValues>(session.userId));
  const [step, setStep] = useState(() => Math.min(restored?.step ?? 0, LAST_STEP));
  const [savedAt, setSavedAt] = useState<string | null>(restored?.savedAt ?? null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: number; ref: string } | null>(null);

  const form = useForm<WizardValues, unknown, CaseCreateInput>({
    // The schema's input type is looser than WizardValues (it coerces strings),
    // so the resolver is cast to the form's types.
    resolver: zodResolver(caseCreateSchema) as unknown as Resolver<WizardValues, unknown, CaseCreateInput>,
    defaultValues: restored?.values ?? EMPTY,
    mode: "onTouched", // validate a field when the user leaves it, then live
  });
  const { register, control, trigger, handleSubmit, setError, reset, formState } = form;
  const { errors } = formState;
  const values = useWatch({ control });

  // --- Draft autosave: 800 ms after the last change, write to localStorage.
  useEffect(() => {
    if (created || !formState.isDirty) return;
    const timer = setTimeout(() => {
      const now = new Date().toISOString();
      if (saveDraft(session.userId, { values: form.getValues(), step, savedAt: now })) setSavedAt(now);
    }, 800);
    return () => clearTimeout(timer);
  }, [values, step, created, formState.isDirty, session.userId, form]);

  // --- Once a field shows an error, re-check it on every keystroke so the
  // message clears while the user types. Otherwise it clears on blur, i.e.
  // when the user taps Continue: the layout jumps under their finger and the
  // tap is lost (reproduced on a 320px phone, where error messages wrap).
  const { subscribe, getFieldState } = form;
  useEffect(
    () =>
      subscribe({
        formState: { values: true },
        callback: ({ name, type }) => {
          const field = name as FieldPath<WizardValues> | undefined;
          if (type === "change" && field && getFieldState(field).invalid) void trigger(field);
        },
      }),
    [subscribe, getFieldState, trigger],
  );

  // --- Move focus to the step heading when the step changes (screen readers
  // announce the new step; keyboard users start at the top of it).
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step, created]);

  const createCase = useMutation({
    mutationFn: (input: CaseCreateInput) =>
      api<{ id: number; ref: string }>("/api/cases", { method: "POST", json: input }),
  });

  async function next() {
    const section = STEPS[step].key as SectionKey;
    // Validate only this step's fields before moving on.
    if (await trigger(section, { shouldFocus: true })) setStep((s) => Math.min(s + 1, LAST_STEP));
  }

  const onSubmit = handleSubmit(
    async (input) => {
      setSubmitError(null);
      try {
        const result = await createCase.mutateAsync(input);
        clearDraft(session.userId);
        void queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
        toast.success(`Case ${result.ref} created`);
        setCreated(result);
      } catch (error) {
        if (error instanceof HttpError && error.fields && Object.keys(error.fields).length > 0) {
          // Server-side validation: show each message on its field and jump to
          // the first step that has a problem.
          const paths = Object.keys(error.fields);
          for (const path of paths) {
            setError(path as FieldPath<WizardValues>, { type: "server", message: error.fields[path]?.[0] });
          }
          setStep(Math.min(...paths.map(stepOf)));
        }
        setSubmitError(
          error instanceof HttpError ? error.message : "Could not reach the server. Your draft is saved; try again.",
        );
      }
    },
    // A restored draft can reach Review with invalid data; send the user to it.
    (invalid) => setStep(stepOf(Object.keys(invalid)[0] ?? "client")),
  );

  function discardDraft() {
    clearDraft(session.userId);
    reset(EMPTY);
    setStep(0);
    setRestored(null);
    setSavedAt(null);
  }

  function startAnother() {
    reset(EMPTY);
    setCreated(null);
    setStep(0);
    setRestored(null);
    setSavedAt(null);
  }

  if (created) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center" role="status">
          <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="size-6" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
              Case {created.ref} created
            </h2>
            <p className="text-sm text-muted-foreground">It starts in Intake and appears in the case list.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href={`/cases/${created.id}`}>Open case</Link>
            </Button>
            <Button variant="outline" onClick={startAnother}>
              Create another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pending = createCase.isPending;
  const e = errors;

  return (
    // min-w-0 on both grid children: without it a grid item never shrinks
    // below its content, and the step bar pushed the page wider than a phone.
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Step indicator: numbers only on phones (plus the current step's name), full names from sm up. */}
      <nav aria-label="Form progress" className="min-w-0">
        <ol className="flex gap-1 sm:gap-2 lg:flex-col lg:gap-1">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={s.key} className={cn("min-w-0", current ? "flex-1 sm:flex-none" : "shrink-0")}>
                <button
                  type="button"
                  onClick={() => done && setStep(i)}
                  disabled={!done}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:gap-3 sm:px-3",
                    current && "bg-accent font-medium text-accent-foreground",
                    done && "cursor-pointer hover:bg-muted",
                    !done && !current && "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular",
                      current && "border-primary bg-primary text-primary-foreground",
                      done && "border-primary text-primary",
                    )}
                  >
                    {done ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
                  </span>
                  {/* Screen readers always get the name; sighted phone users see it for the current step only. */}
                  <span className={cn("truncate", !current && "sr-only sm:not-sr-only")}>
                    {s.title}
                    {done && <span className="sr-only"> (completed)</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 hidden items-center gap-2 text-xs text-muted-foreground lg:flex" aria-live="polite">
          {savedAt ? (
            <>
              <CloudUpload className="size-3.5" aria-hidden="true" /> Draft saved {formatDateTime(savedAt).split(", ")[1]}
            </>
          ) : (
            "Your progress is saved automatically."
          )}
        </p>
      </nav>

      <Card className="min-w-0">
        <CardContent>
          {restored && step < LAST_STEP + 1 && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-sm">
              <span>We restored your unsaved draft from {formatDateTime(restored.savedAt)}.</span>
              <Button variant="ghost" size="sm" onClick={discardDraft}>
                <RotateCcw /> Start over
              </Button>
            </div>
          )}

          <form onSubmit={onSubmit} noValidate>
            <fieldset disabled={pending} className="space-y-6">
              <div className="space-y-1">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Step {step + 1} of {STEPS.length}
                </p>
                <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
                  {STEPS[step].title}
                </h2>
                <p className="text-sm text-muted-foreground">{STEPS[step].description}</p>
              </div>

              {submitError && (
                <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {submitError}
                </div>
              )}

              <div key={step} className="animate-in space-y-5 duration-300 fade-in-0 slide-in-from-right-2">
                {step === 0 && <ClientStep form={form} clients={clients} values={values as WizardValues} />}
                {step === 1 && (
                  <MatterStep register={register} errors={e} practiceArea={values.matter?.practiceArea ?? ""} />
                )}
                {step === 2 && (
                  <EngagementStep
                    register={register}
                    errors={e}
                    feeType={(values.engagement?.feeType ?? "fixed") as FeeType}
                    assignees={assignees}
                  />
                )}
                {step === 3 && (
                  <ReviewStep values={values as WizardValues} clients={clients} assignees={assignees} goTo={setStep} />
                )}
              </div>

              <div className="flex items-center justify-between gap-2 border-t pt-5">
                <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                  <ArrowLeft /> Back
                </Button>
                {/* Distinct keys matter: without them React reuses one <button> and flips
                    its type to "submit" mid-click, which submits the form from step 3. */}
                {step < LAST_STEP ? (
                  <Button key="continue" type="button" onClick={next}>
                    Continue <ArrowRight />
                  </Button>
                ) : (
                  <Button key="submit" type="submit">
                    {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
                    {pending ? "Creating case…" : "Create case"}
                  </Button>
                )}
              </div>
            </fieldset>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */

type Form = ReturnType<typeof useForm<WizardValues, unknown, CaseCreateInput>>;
type Errors = Form["formState"]["errors"];
type Register = Form["register"];

function fieldProps(id: string, error?: string) {
  return { id, "aria-invalid": !!error, "aria-describedby": describedBy(id, error) };
}

function ClientStep({ form, clients, values }: { form: Form; clients: ClientOption[]; values: WizardValues }) {
  const { register, setValue, formState } = form;
  const e = formState.errors.client;
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients;
  }, [clients, search]);
  const mode = values.client?.mode ?? "existing";
  const type = values.client?.type ?? "individual";

  return (
    <>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Client</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["existing", "Existing client", "Pick from the firm's clients"],
              ["new", "New client", "Register them now"],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                mode === value ? "border-primary bg-accent/50" : "hover:bg-muted/50",
              )}
            >
              <input
                type="radio"
                value={value}
                className="mt-1 accent-(--primary)"
                {...register("client.mode", { onChange: () => form.clearErrors("client") })}
              />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {mode === "existing" ? (
        <div className="space-y-2">
          <FormField id="client-search" label="Find a client" hint={`${filtered.length} of ${clients.length} clients`}>
            <Input
              id="client-search"
              type="search"
              placeholder="Type a name…"
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              aria-controls="client-clientId"
              aria-describedby="client-search-hint"
            />
          </FormField>
          <FormField id="client-clientId" label="Client" required error={e?.clientId?.message}>
            <select
              size={7}
              {...fieldProps("client-clientId", e?.clientId?.message)}
              {...register("client.clientId")}
              className="w-full rounded-md border border-input bg-card p-1 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive [&>option]:rounded [&>option]:px-2 [&>option]:py-1.5 [&>option:checked]:bg-accent"
            >
              {filtered.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {CLIENT_TYPE_LABELS[c.type]} · {c.city}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      ) : (
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Client type</legend>
            <div className="flex gap-2">
              {(["individual", "company"] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={type === t ? "default" : "outline"}
                  size="sm"
                  aria-pressed={type === t}
                  onClick={() => setValue("client.type", t, { shouldDirty: true })}
                >
                  {t === "company" ? <Building2 /> : <UserRound />} {CLIENT_TYPE_LABELS[t]}
                </Button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="client-name" label={type === "company" ? "Company name" : "Full name"} required error={e?.name?.message}>
              <Input {...fieldProps("client-name", e?.name?.message)} autoComplete="off" {...register("client.name")} />
            </FormField>
            {/* Conditional fields: only companies have a contact person and trade licence. */}
            {type === "company" && (
              <>
                <FormField id="client-contactName" label="Contact person" required error={e?.contactName?.message}>
                  <Input {...fieldProps("client-contactName", e?.contactName?.message)} {...register("client.contactName")} />
                </FormField>
                <FormField id="client-tradeLicense" label="Trade licence no." required error={e?.tradeLicense?.message}>
                  <Input {...fieldProps("client-tradeLicense", e?.tradeLicense?.message)} {...register("client.tradeLicense")} />
                </FormField>
              </>
            )}
            <FormField id="client-email" label="Email" required error={e?.email?.message}>
              <Input type="email" {...fieldProps("client-email", e?.email?.message)} {...register("client.email")} />
            </FormField>
            <FormField id="client-phone" label="Phone" required error={e?.phone?.message} hint="e.g. +971 50 123 4567">
              <Input
                type="tel"
                {...fieldProps("client-phone", e?.phone?.message)}
                aria-describedby={describedBy("client-phone", e?.phone?.message, "hint")}
                {...register("client.phone")}
              />
            </FormField>
            <FormField id="client-city" label="City / emirate" required error={e?.city?.message}>
              <Input {...fieldProps("client-city", e?.city?.message)} {...register("client.city")} />
            </FormField>
          </div>
        </div>
      )}
    </>
  );
}

function MatterStep({ register, errors, practiceArea }: { register: Register; errors: Errors; practiceArea: string }) {
  const e = errors.matter;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormField id="matter-title" label="Case title" required error={e?.title?.message}>
          <Input {...fieldProps("matter-title", e?.title?.message)} placeholder="e.g. Lease dispute – Marina tower" {...register("matter.title")} />
        </FormField>
      </div>
      <FormField id="matter-practiceArea" label="Practice area" required error={e?.practiceArea?.message}>
        <NativeSelect {...fieldProps("matter-practiceArea", e?.practiceArea?.message)} {...register("matter.practiceArea")}>
          <option value="" disabled>
            Choose…
          </option>
          {PRACTICE_AREAS.map((a) => (
            <option key={a} value={a}>
              {PRACTICE_AREA_LABELS[a]}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="matter-priority" label="Priority">
        <NativeSelect id="matter-priority" {...register("matter.priority")}>
          {CASE_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {CASE_PRIORITY_LABELS[p]}
            </option>
          ))}
        </NativeSelect>
      </FormField>

      {/* Conditional fields: shown (and required) only for litigation. */}
      {practiceArea === "litigation" && (
        <>
          <FormField id="matter-courtName" label="Court" required error={e?.courtName?.message}>
            <Input
              {...fieldProps("matter-courtName", e?.courtName?.message)}
              placeholder="e.g. Dubai Court of First Instance"
              {...register("matter.courtName")}
            />
          </FormField>
          <FormField id="matter-opposingParty" label="Opposing party" error={e?.opposingParty?.message}>
            <Input id="matter-opposingParty" {...register("matter.opposingParty")} />
          </FormField>
        </>
      )}

      <FormField id="matter-dueDate" label="Target date" error={e?.dueDate?.message}>
        <Input type="date" {...fieldProps("matter-dueDate", e?.dueDate?.message)} {...register("matter.dueDate")} />
      </FormField>
      <div className="sm:col-span-2">
        <FormField id="matter-description" label="Description" error={e?.description?.message}>
          <Textarea
            rows={4}
            {...fieldProps("matter-description", e?.description?.message)}
            placeholder="Background, scope and what the client wants to achieve."
            {...register("matter.description")}
          />
        </FormField>
      </div>
    </div>
  );
}

function EngagementStep({
  register,
  errors,
  feeType,
  assignees,
}: {
  register: Register;
  errors: Errors;
  feeType: FeeType;
  assignees: Assignee[];
}) {
  const e = errors.engagement;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="engagement-feeType" label="Fee arrangement">
        <NativeSelect id="engagement-feeType" {...register("engagement.feeType")}>
          {FEE_TYPES.map((f) => (
            <option key={f} value={f}>
              {FEE_TYPE_LABELS[f]}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      {/* The amount's meaning (and label) depends on the fee arrangement. */}
      <FormField id="engagement-feeAmount" label={FEE_LABEL[feeType]} required error={e?.feeAmount?.message}>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          {...fieldProps("engagement-feeAmount", e?.feeAmount?.message)}
          {...register("engagement.feeAmount")}
        />
      </FormField>
      <div className="sm:col-span-2">
        <FormField id="engagement-assigneeId" label="Responsible lawyer" hint="You can assign later." error={e?.assigneeId?.message}>
          <NativeSelect
            {...fieldProps("engagement-assigneeId", e?.assigneeId?.message)}
            aria-describedby={describedBy("engagement-assigneeId", e?.assigneeId?.message, "hint")}
            {...register("engagement.assigneeId")}
          >
            <option value="">Unassigned</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.title}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </div>
    </div>
  );
}

function ReviewStep({
  values,
  clients,
  assignees,
  goTo,
}: {
  values: WizardValues;
  clients: ClientOption[];
  assignees: Assignee[];
  goTo: (step: number) => void;
}) {
  const { client, matter, engagement } = values;
  const existing = clients.find((c) => String(c.id) === String(client.clientId));
  const lawyer = assignees.find((a) => String(a.id) === String(engagement.assigneeId));
  const fee = Number(engagement.feeAmount) || 0;

  const sections: { title: string; step: number; rows: [string, React.ReactNode][] }[] = [
    {
      title: "Client",
      step: 0,
      rows:
        client.mode === "existing"
          ? [["Client", existing ? `${existing.name} (existing)` : "Not selected"]]
          : [
              ["Client", `${client.name} (new ${CLIENT_TYPE_LABELS[client.type].toLowerCase()})`],
              ...(client.type === "company"
                ? ([
                    ["Contact", client.contactName],
                    ["Trade licence", client.tradeLicense],
                  ] as [string, string][])
                : []),
              ["Email", client.email],
              ["Phone", client.phone],
              ["City", client.city],
            ],
    },
    {
      title: "Matter",
      step: 1,
      rows: [
        ["Title", matter.title],
        ["Practice area", PRACTICE_AREA_LABELS[matter.practiceArea as keyof typeof PRACTICE_AREA_LABELS] ?? "–"],
        ["Priority", CASE_PRIORITY_LABELS[matter.priority as keyof typeof CASE_PRIORITY_LABELS]],
        ...(matter.practiceArea === "litigation"
          ? ([
              ["Court", matter.courtName],
              ["Opposing party", matter.opposingParty || "–"],
            ] as [string, string][])
          : []),
        ["Target date", matter.dueDate ? formatPlainDate(matter.dueDate) : "–"],
      ],
    },
    {
      title: "Engagement",
      step: 2,
      rows: [
        ["Fee", `${formatCurrency(fee)} · ${FEE_TYPE_LABELS[engagement.feeType]}`],
        ["Lawyer", lawyer ? lawyer.name : "Unassigned"],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <section key={section.title} className="rounded-lg border p-4" aria-labelledby={`review-${section.step}`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 id={`review-${section.step}`} className="text-sm font-semibold">
              {section.title}
            </h3>
            <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => goTo(section.step)}>
              Edit<span className="sr-only"> {section.title.toLowerCase()}</span>
            </Button>
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[140px_1fr]">
            {section.rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="break-words">{value || "–"}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
