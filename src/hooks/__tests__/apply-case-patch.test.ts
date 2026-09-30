import { describe, expect, it } from "vitest";
import { applyCasePatch } from "../use-case-detail";
import type { CaseDetail } from "@/lib/cases/detail-types";

const detail = {
  id: 1,
  title: "Old title",
  status: "open",
  assignee: { id: 2, name: "Omar Al-Harbi", title: "Senior Associate" },
} as CaseDetail;
const assignees = [{ id: 5, name: "Rania Saleh", title: "Associate" }];

describe("applyCasePatch()", () => {
  it("merges edited fields into the cached case", () => {
    const next = applyCasePatch(detail, { title: "New title", status: "closed" }, assignees);
    expect(next).toMatchObject({ title: "New title", status: "closed" });
  });

  it("resolves a new assignee id to the person shown on screen", () => {
    expect(applyCasePatch(detail, { assigneeId: 5 }, assignees).assignee).toEqual(assignees[0]);
    expect(applyCasePatch(detail, { assigneeId: null }, assignees).assignee).toBeNull();
  });

  it("leaves the assignee alone when the patch does not mention it", () => {
    expect(applyCasePatch(detail, { title: "x" }, assignees).assignee).toBe(detail.assignee);
  });
});
