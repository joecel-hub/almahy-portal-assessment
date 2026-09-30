import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states";
import { getCasesByArea, getKpis, getTrend, getUpcomingConsultations, getWorkload } from "@/server/services/dashboard";
import type { ResolvedRange } from "@/lib/dashboard/range";
import { CONSULTATION_MODE_LABELS, PRACTICE_AREA_LABELS } from "@/lib/domain";
import { formatDateTime } from "@/lib/format";
import { KpiCards } from "./kpi-cards";
import { ChartCard } from "./chart-card";
import { AreaChart, TrendChart, WorkloadChart } from "./lazy-charts";

/*
 * Each section is an async Server Component that fetches only its own data.
 * The page wraps each in <Suspense>, so they stream in independently: the
 * fast KPI query is on screen before the slower trend query finishes.
 */

export async function KpiSection({ range }: { range: ResolvedRange }) {
  return <KpiCards kpis={await getKpis(range)} />;
}

export async function TrendSection({ range }: { range: ResolvedRange }) {
  const data = await getTrend(range);
  const label = (s: string) =>
    new Date(`${s}T00:00:00Z`).toLocaleDateString("en-GB", {
      day: range.bucket === "week" ? "numeric" : undefined,
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  return (
    <ChartCard
      title="Cases opened vs closed"
      description={`Per ${range.bucket}, ${range.label.toLowerCase()}`}
      table={{ columns: [range.bucket === "week" ? "Week of" : "Month", "Opened", "Closed"], rows: data.map((d) => [label(d.start), d.opened, d.closed]) }}
    >
      <TrendChart data={data} bucket={range.bucket} />
    </ChartCard>
  );
}

export async function AreaSection({ range }: { range: ResolvedRange }) {
  const data = await getCasesByArea(range);
  return (
    <ChartCard
      title="New cases by practice area"
      description={range.label}
      table={{ columns: ["Practice area", "Cases"], rows: data.map((d) => [PRACTICE_AREA_LABELS[d.area], d.count]) }}
    >
      {data.length ? <AreaChart data={data} /> : <EmptyState title="No new cases in this period" />}
    </ChartCard>
  );
}

export async function WorkloadSection() {
  const data = await getWorkload();
  return (
    <ChartCard
      title="Workload by lawyer"
      description="Active cases assigned to each lawyer right now"
      table={{ columns: ["Lawyer", "Active cases"], rows: data.map((d) => [d.name, d.count]) }}
    >
      <WorkloadChart data={data} />
    </ChartCard>
  );
}

export async function UpcomingSection() {
  const items = await getUpcomingConsultations();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Upcoming consultations</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nothing scheduled" description="New consultations will appear here." />
        ) : (
          <ul className="divide-y">
            {items.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.clientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.subject}
                    {c.lawyerName && ` · ${c.lawyerName}`}
                    {c.caseId && (
                      <>
                        {" · "}
                        <Link href={`/cases/${c.caseId}`} className="font-mono hover:underline">
                          {c.caseRef}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium tabular">{formatDateTime(c.scheduledAt)}</p>
                  <Badge variant="outline" className="mt-1">
                    {CONSULTATION_MODE_LABELS[c.mode]}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* Skeletons shown while each section streams in. */

export function KpiSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <Card key={i} className="gap-3 px-5 py-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-32" />
        </Card>
      ))}
    </div>
  );
}

export function CardSkeleton({ height = "h-72" }: { height?: string }) {
  return (
    <Card aria-hidden="true">
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full ${height}`} />
      </CardContent>
    </Card>
  );
}
