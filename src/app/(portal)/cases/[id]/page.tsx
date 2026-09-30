import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { requireSession } from "@/server/auth/session";
import { getCaseDetail } from "@/server/services/case-detail";
import { listAssignees } from "@/server/services/cases";
import { caseKeys } from "@/lib/cases/query-keys";
import { caseIdSchema } from "@/lib/validation/case";
import { CaseDetailView } from "@/components/cases/detail/case-detail-view";

async function parseId(params: Promise<{ id: string }>) {
  const parsed = caseIdSchema.safeParse(await params);
  if (!parsed.success) notFound();
  return parsed.data.id;
}

// Tab title shows the case reference. getCaseDetail is request-cached, so this
// does not cost a second database query.
export async function generateMetadata({ params }: PageProps<"/cases/[id]">): Promise<Metadata> {
  const detail = await getCaseDetail(await parseId(params));
  return { title: detail ? `${detail.ref} · ${detail.title}` : "Case not found" };
}

export default async function CaseDetailPage({ params }: PageProps<"/cases/[id]">) {
  await requireSession("case:read");
  const id = await parseId(params);

  const queryClient = new QueryClient();
  const [detail, assignees] = await Promise.all([getCaseDetail(id), listAssignees()]);
  if (!detail) notFound();
  queryClient.setQueryData(caseKeys.detail(id), detail);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CaseDetailView id={id} assignees={assignees} />
    </HydrationBoundary>
  );
}
