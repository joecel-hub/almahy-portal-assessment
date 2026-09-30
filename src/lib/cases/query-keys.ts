import type { CaseListParams } from "./search-params";

/**
 * TanStack Query cache keys, built hierarchically so one call can target a
 * whole family: invalidating `caseKeys.all` refreshes every list and detail,
 * `caseKeys.lists()` only the paginated lists.
 */
export const caseKeys = {
  all: ["cases"] as const,
  lists: () => [...caseKeys.all, "list"] as const,
  list: (params: CaseListParams) => [...caseKeys.lists(), params] as const,
  details: () => [...caseKeys.all, "detail"] as const,
  detail: (id: number) => [...caseKeys.details(), id] as const,
};
