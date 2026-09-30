import { describe, expect, it } from "vitest";
import { caseCreateSchema, clientStepSchema, matterStepSchema } from "../case-create";

const newCompany = {
  mode: "new",
  type: "company",
  name: "Marina Heights Developments",
  contactName: "Hessa Al Mansoori",
  tradeLicense: "TL-448812",
  email: " Legal@MarinaHeights.example ",
  phone: "+971 50 123 4567",
  city: "Dubai",
};

const errorPaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.error?.issues.map((i) => i.path.join(".")) ?? [];

describe("client step", () => {
  it("accepts an existing client by id (from a <select> string)", () => {
    expect(clientStepSchema.parse({ mode: "existing", clientId: "42" })).toEqual({ mode: "existing", clientId: 42 });
  });

  it("requires contact person and trade licence only for companies", () => {
    const company = clientStepSchema.safeParse({ ...newCompany, contactName: "", tradeLicense: "" });
    expect(errorPaths(company)).toEqual(["contactName", "tradeLicense"]);

    const individual = clientStepSchema.safeParse({ ...newCompany, type: "individual", contactName: "", tradeLicense: "" });
    expect(individual.success).toBe(true);
  });

  it("normalises the email address", () => {
    const parsed = clientStepSchema.parse(newCompany);
    expect(parsed.mode === "new" && parsed.email).toBe("legal@marinaheights.example");
  });
});

describe("matter step", () => {
  const base = { title: "Construction delay claim", priority: "high", description: "", dueDate: "", opposingParty: "" };

  it("requires a court for litigation", () => {
    const result = matterStepSchema.safeParse({ ...base, practiceArea: "litigation", courtName: "" });
    expect(errorPaths(result)).toEqual(["courtName"]);
  });

  it("drops court fields for other practice areas", () => {
    const parsed = matterStepSchema.parse({ ...base, practiceArea: "corporate", courtName: "Leftover court" });
    expect(parsed.courtName).toBeNull();
    expect(parsed.dueDate).toBeNull(); // empty date input becomes null
  });
});

describe("full payload", () => {
  it("coerces form strings into the typed API input", () => {
    const parsed = caseCreateSchema.parse({
      client: { mode: "existing", clientId: "7" },
      matter: { title: "Lease review", practiceArea: "real_estate", priority: "low", description: "", dueDate: "2026-12-01", courtName: "", opposingParty: "" },
      engagement: { feeType: "fixed", feeAmount: "15000", assigneeId: "" },
    });
    expect(parsed.engagement).toEqual({ feeType: "fixed", feeAmount: 15000, assigneeId: null });
    expect(parsed.matter.dueDate).toBe("2026-12-01");
  });

  it("rejects a zero fee", () => {
    const result = caseCreateSchema.safeParse({
      client: { mode: "existing", clientId: "7" },
      matter: { title: "Lease review", practiceArea: "real_estate", priority: "low", description: "", dueDate: "", courtName: "", opposingParty: "" },
      engagement: { feeType: "hourly", feeAmount: "0", assigneeId: "" },
    });
    expect(errorPaths(result)).toContain("engagement.feeAmount");
  });
});
