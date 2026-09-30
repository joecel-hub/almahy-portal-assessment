import { afterEach, describe, expect, it, vi } from "vitest";
import { clearDraft, draftKey, loadDraft, saveDraft } from "../draft";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("new case draft storage", () => {
  it("saves, restores and clears a draft per user", () => {
    const draft = { values: { title: "Lease review" }, step: 2, savedAt: "2026-09-30T10:00:00.000Z" };
    expect(saveDraft(1, draft)).toBe(true);
    expect(loadDraft(1)).toEqual(draft);
    expect(loadDraft(2)).toBeNull(); // another user never sees it
    clearDraft(1);
    expect(loadDraft(1)).toBeNull();
  });

  it("ignores corrupted drafts instead of crashing the form", () => {
    localStorage.setItem(draftKey(1), "{not json");
    expect(loadDraft(1)).toBeNull();
  });

  it("reports failure when storage is unavailable (private mode, quota)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(saveDraft(1, { values: {}, step: 0, savedAt: "" })).toBe(false);
  });
});
