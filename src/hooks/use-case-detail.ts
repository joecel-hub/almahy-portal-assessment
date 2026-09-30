"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { caseKeys } from "@/lib/cases/query-keys";
import type { CaseDetail } from "@/lib/cases/detail-types";
import type { Assignee } from "@/lib/cases/types";
import type { CaseUpdateInput } from "@/lib/validation/case";

export function useCaseDetail(id: number) {
  return useQuery({
    queryKey: caseKeys.detail(id),
    queryFn: ({ signal }) => api<CaseDetail>(`/api/cases/${id}`, { signal }),
  });
}

/** Merge a patch into the cached case, resolving assigneeId to a display name. */
export function applyCasePatch(detail: CaseDetail, patch: CaseUpdateInput, assignees: Assignee[]): CaseDetail {
  const { assigneeId, ...fields } = patch;
  const next: CaseDetail = { ...detail, ...fields };
  if (assigneeId !== undefined) {
    const person = assignees.find((a) => a.id === assigneeId);
    next.assignee = person ? { id: person.id, name: person.name, title: person.title } : null;
  }
  return next;
}

/**
 * Edits a case with an optimistic update: the page shows the new values at
 * once, rolls back if the server rejects them, then refetches so the timeline
 * picks up the activity entry the server wrote.
 */
export function useUpdateCase(id: number, assignees: Assignee[]) {
  const queryClient = useQueryClient();
  const key = caseKeys.detail(id);

  return useMutation({
    mutationFn: (patch: CaseUpdateInput) =>
      api<unknown>(`/api/cases/${id}`, { method: "PATCH", json: patch }),

    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CaseDetail>(key);
      if (previous) queryClient.setQueryData(key, applyCasePatch(previous, patch, assignees));
      return { previous };
    },

    onError: (error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error("Changes were not saved", { description: error.message });
    },

    onSuccess: () => toast.success("Case updated"),

    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({ queryKey: caseKeys.lists() }),
      ]),
  });
}

export function useDeleteCase(id: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => api<unknown>(`/api/cases/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Case deleted");
      router.replace("/cases");
      queryClient.removeQueries({ queryKey: caseKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
    },
    onError: (error) => toast.error("Could not delete the case", { description: error.message }),
  });
}
