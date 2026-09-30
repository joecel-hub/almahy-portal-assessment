"use client";

import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/types";
import { caseKeys } from "@/lib/cases/query-keys";
import { serializeCaseSearchParams, type CaseListParams } from "@/lib/cases/search-params";
import { applyBulkToPage } from "@/lib/cases/optimistic";
import type { Assignee, CaseListItem } from "@/lib/cases/types";
import type { CaseBulkInput } from "@/lib/validation/case";
import { CASE_STATUS_LABELS } from "@/lib/domain";

export function casesListQuery(params: CaseListParams) {
  return queryOptions({
    queryKey: caseKeys.list(params),
    // `signal` aborts the request if the user changes filters before it returns.
    queryFn: ({ signal }) =>
      api<Paginated<CaseListItem>>(`/api/cases${serializeCaseSearchParams(params)}`, { signal }),
  });
}

/**
 * Paginated case list. `keepPreviousData` keeps the current page on screen
 * while the next one loads, so the table never flashes empty between pages.
 */
export function useCasesList(params: CaseListParams) {
  return useQuery({ ...casesListQuery(params), placeholderData: keepPreviousData });
}

function describe(input: CaseBulkInput, count: number, assignees: Assignee[]) {
  const n = `${count} case${count === 1 ? "" : "s"}`;
  if (input.action === "delete") return `Deleted ${n}`;
  if (input.action === "set_status") return `Moved ${n} to ${CASE_STATUS_LABELS[input.status]}`;
  const name = assignees.find((a) => a.id === input.assigneeId)?.name;
  return name ? `Assigned ${n} to ${name}` : `Unassigned ${n}`;
}

/**
 * Bulk delete / status / assign with an optimistic update:
 *  1. onMutate: cancel in-flight list fetches, snapshot every cached list
 *     page, and write the expected result into the cache (instant UI).
 *  2. onError: restore the snapshots (rollback) and explain what failed.
 *  3. onSettled: invalidate, so the lists refetch the server's truth.
 */
export function useBulkCaseAction(assignees: Assignee[]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CaseBulkInput) =>
      api<{ affected: number }>("/api/cases/bulk", { method: "POST", json: input }),

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: caseKeys.lists() });
      const snapshot = queryClient.getQueriesData<Paginated<CaseListItem>>({ queryKey: caseKeys.lists() });
      queryClient.setQueriesData<Paginated<CaseListItem>>({ queryKey: caseKeys.lists() }, (page) =>
        page ? applyBulkToPage(page, input, assignees) : page,
      );
      return { snapshot };
    },

    onError: (error, _input, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error("Changes were not saved", { description: error.message });
    },

    onSuccess: (_result, input) => {
      toast.success(describe(input, input.ids.length, assignees));
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: caseKeys.all }),
  });
}
