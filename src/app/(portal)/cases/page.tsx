import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { requireSession } from "@/server/auth/session";
import { listAssignees, listCases } from "@/server/services/cases";
import { can } from "@/lib/auth/permissions";
import { caseKeys } from "@/lib/cases/query-keys";
import { loadCaseSearchParams } from "@/lib/cases/search-params";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CasesTable } from "@/components/cases/cases-table";

export const metadata: Metadata = { title: "Cases" };

/**
 * Server Component. On first load it reads the filters from the URL, queries
 * the database directly (no HTTP hop to our own API) and hands the result to
 * the client cache via HydrationBoundary. The table renders with data
 * immediately (no loading spinner, no request waterfall); after that, filter
 * and page changes are fetched client-side from the REST API.
 */
export default async function CasesPage({ searchParams }: PageProps<"/cases">) {
  const session = await requireSession("case:read");
  const params = loadCaseSearchParams(await searchParams);

  const queryClient = new QueryClient();
  const [, assignees] = await Promise.all([
    queryClient.prefetchQuery({ queryKey: caseKeys.list(params), queryFn: () => listCases(params) }),
    listAssignees(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cases"
        description="Search, filter and manage every matter the firm is handling."
        actions={
          can(session.role, "case:create") && (
            <Button asChild>
              <Link href="/cases/new">
                <Plus /> New case
              </Link>
            </Button>
          )
        }
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CasesTable assignees={assignees} />
      </HydrationBoundary>
    </div>
  );
}
