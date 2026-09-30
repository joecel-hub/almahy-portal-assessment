import { describe, expect, it } from "vitest";
import { PERMISSIONS, can } from "../permissions";

describe("can()", () => {
  it("grants admins every permission", () => {
    for (const p of PERMISSIONS) expect(can("admin", p)).toBe(true);
  });

  it("lets managers edit but never delete", () => {
    expect(can("manager", "case:update")).toBe(true);
    expect(can("manager", "case:create")).toBe(true);
    expect(can("manager", "case:delete")).toBe(false);
    expect(can("manager", "settings:manage")).toBe(false);
  });

  it("keeps viewers read-only", () => {
    const allowed = PERMISSIONS.filter((p) => can("viewer", p));
    expect(allowed.sort()).toEqual(["case:read", "client:read", "dashboard:view"]);
  });
});
