import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldAlert } from "lucide-react";
import { requireSession } from "@/server/auth/session";
import { loadDashboardParams, resolveRange } from "@/lib/dashboard/range";
import { PageHeader } from "@/components/page-header";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  AreaSection,
  CardSkeleton,
  KpiSection,
  KpiSkeleton,
  TrendSection,
  UpcomingSection,
  WorkloadSection,
} from "@/components/dashboard/sections";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Rendering strategy: a dynamic Server Component (depends on the session and
 * the URL). The header and filter render immediately; each widget is an async
 * Server Component inside its own <Suspense>, so they stream in as their
 * queries finish. Only the filter and the charts ship JavaScript.
 */
export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const session = await requireSession("dashboard:view");
  const sp = await searchParams;
  const range = resolveRange(loadDashboardParams(sp));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${session.name.split(" ")[0]}`}
        description="How the practice is doing: caseload, throughput, fees and what's coming up."
      />

      {sp.denied && (
        <p role="alert" className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
          You don&apos;t have permission to open that page, so you were brought back to the dashboard.
        </p>
      )}

      <DashboardShell rangeLabel={range.label}>
        <Suspense fallback={<KpiSkeleton />}>
          <KpiSection range={range} />
        </Suspense>

        <Suspense fallback={<CardSkeleton height="h-80" />}>
          <TrendSection range={range} />
        </Suspense>

        <div className="grid gap-6 lg:grid-cols-2">
          <Suspense fallback={<CardSkeleton height="h-56" />}>
            <AreaSection range={range} />
          </Suspense>
          <Suspense fallback={<CardSkeleton height="h-56" />}>
            <WorkloadSection />
          </Suspense>
        </div>

        <Suspense fallback={<CardSkeleton height="h-48" />}>
          <UpcomingSection />
        </Suspense>
      </DashboardShell>
    </div>
  );
}
