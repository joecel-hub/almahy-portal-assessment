import { describe, expect, it } from "vitest";
import { loadCaseSearchParams, serializeCaseSearchParams } from "../search-params";

describe("case list URL contract", () => {
  it("parses filters, sort and paging from the query string", () => {
    const params = loadCaseSearchParams("?q=smith&status=open,on_hold&priority=urgent&sort=feeAmount&order=asc&page=3&size=20");
    expect(params).toEqual({
      q: "smith",
      status: ["open", "on_hold"],
      priority: ["urgent"],
      area: [],
      sort: "feeAmount",
      order: "asc",
      page: 3,
      size: 20,
    });
  });

  it("falls back to safe defaults for unknown or hostile values", () => {
    const params = loadCaseSearchParams("?sort=id;DROP TABLE cases&status=bogus&size=5000&page=abc&order=sideways");
    expect(params).toMatchObject({ sort: "openedAt", order: "desc", status: [], size: 10, page: 1 });
  });

  it("omits defaults when serialising, keeping URLs short", () => {
    const params = loadCaseSearchParams("?status=closed");
    expect(serializeCaseSearchParams(params)).toBe("?status=closed");
  });
});
