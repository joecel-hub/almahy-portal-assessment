import { describe, expect, it } from "vitest";
import { safeNext } from "../login-form";

describe("safeNext()", () => {
  it("keeps same-site paths, including their query string", () => {
    expect(safeNext("/cases?status=open")).toBe("/cases?status=open");
  });

  it.each(["https://evil.example", "//evil.example", "javascript:alert(1)", null, ""])(
    "falls back to /dashboard for %s",
    (value) => {
      expect(safeNext(value)).toBe("/dashboard");
    },
  );
});
