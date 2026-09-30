import { describe, expect, it } from "vitest";
import { loadDashboardParams, resolveRange } from "../range";

const NOW = new Date("2026-09-30T15:00:00Z");
const resolve = (qs: string) => resolveRange(loadDashboardParams(qs), NOW);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

describe("resolveRange()", () => {
  it("defaults to the last 12 whole months, bucketed by month", () => {
    const r = resolve("");
    expect([ymd(r.from), ymd(r.to), r.bucket, r.preset]).toEqual(["2025-10-01", "2026-10-01", "month", "12m"]);
  });

  it("uses weekly buckets for short ranges", () => {
    const r = resolve("?range=30d");
    expect([ymd(r.from), ymd(r.to), r.bucket]).toEqual(["2026-09-01", "2026-10-01", "week"]);
  });

  it("compares against an equally long previous period", () => {
    const r = resolve("?range=90d");
    expect(r.from.getTime() - r.previousFrom.getTime()).toBe(r.to.getTime() - r.from.getTime());
  });

  it("includes the whole last day of a custom range", () => {
    const r = resolve("?range=custom&from=2026-01-01&to=2026-03-31");
    expect([ymd(r.from), ymd(r.to), r.label]).toEqual(["2026-01-01", "2026-04-01", "1 Jan 2026 – 31 Mar 2026"]);
  });

  it.each([
    ["reversed", "?range=custom&from=2026-05-01&to=2026-01-01"],
    ["incomplete", "?range=custom&from=2026-05-01"],
    ["too long", "?range=custom&from=2019-01-01&to=2026-01-01"],
    ["garbage", "?range=forever&from=yesterday"],
  ])("falls back to the default for a %s range", (_, qs) => {
    expect(resolve(qs).preset).toBe("12m");
  });
});
