/**
 * Draft autosave for the New Case wizard, kept in localStorage.
 *
 * Versioned key: if the form shape changes in a later release, old drafts are
 * ignored instead of crashing the form. Scoped per user, so a shared computer
 * never shows one person's draft to another. Every access is wrapped in
 * try/catch because storage can be unavailable (private mode, quota).
 */
const VERSION = 1;
export const draftKey = (userId: number) => `almahy:new-case-draft:v${VERSION}:${userId}`;

export type Draft<T> = { values: T; step: number; savedAt: string };

export function loadDraft<T>(userId: number): Draft<T> | null {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft<T>;
    return draft && typeof draft === "object" && draft.values ? draft : null;
  } catch {
    return null;
  }
}

export function saveDraft<T>(userId: number, draft: Draft<T>): boolean {
  try {
    localStorage.setItem(draftKey(userId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(userId: number) {
  try {
    localStorage.removeItem(draftKey(userId));
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
