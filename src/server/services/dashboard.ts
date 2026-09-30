import "server-only";
import { cache } from "react";
import { and, asc, count, desc, eq, gte, lt, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { cases, clients, consultations, users } from "@/server/db/schema";
import type { ResolvedRange } from "@/lib/dashboard/range";
import type {
  AreaPoint,
  DashboardData,
  DashboardKpis,
  TrendPoint,
  UpcomingConsultation,
  WorkloadPoint,
} from "@/lib/dashboard/types";

/**
 * Dashboard analytics. Each widget is its own function so the page can stream
 * them independently (one slow query never blocks the others), and each is
 * wrapped in React `cache` so a widget and the API share one query per request.
 */

const iso = (d: Date) => d.toISOString();

/** All six KPIs, current and previous period, in a single table scan. */
export const getKpis = cache(async (r: ResolvedRange): Promise<DashboardKpis> => {
  const [from, to, prev] = [iso(r.from), iso(r.to), iso(r.previousFrom)];
  const inRange = (col: typeof cases.openedAt | typeof cases.closedAt, a: string, b: string) =>
    sql`${col} >= ${a} and ${col} < ${b}`;

  const [row] = await db()
    .select({
      active: sql<number>`count(*) filter (where ${cases.status} <> 'closed')`.mapWith(Number),
      opened: sql<number>`count(*) filter (where ${inRange(cases.openedAt, from, to)})`.mapWith(Number),
      openedPrev: sql<number>`count(*) filter (where ${inRange(cases.openedAt, prev, from)})`.mapWith(Number),
      closed: sql<number>`count(*) filter (where ${inRange(cases.closedAt, from, to)})`.mapWith(Number),
      closedPrev: sql<number>`count(*) filter (where ${inRange(cases.closedAt, prev, from)})`.mapWith(Number),
      avgDays: sql<number>`coalesce(avg(extract(epoch from ${cases.closedAt} - ${cases.openedAt}) / 86400) filter (where ${inRange(cases.closedAt, from, to)}), 0)`.mapWith(Number),
      avgDaysPrev: sql<number>`coalesce(avg(extract(epoch from ${cases.closedAt} - ${cases.openedAt}) / 86400) filter (where ${inRange(cases.closedAt, prev, from)}), 0)`.mapWith(Number),
      fees: sql<number>`coalesce(sum(${cases.feeAmount}) filter (where ${cases.feeType} = 'fixed' and ${inRange(cases.openedAt, from, to)}), 0)`.mapWith(Number),
      feesPrev: sql<number>`coalesce(sum(${cases.feeAmount}) filter (where ${cases.feeType} = 'fixed' and ${inRange(cases.openedAt, prev, from)}), 0)`.mapWith(Number),
    })
    .from(cases);

  const now = new Date();
  const [{ upcoming }] = await db()
    .select({ upcoming: count() })
    .from(consultations)
    .where(
      and(
        eq(consultations.status, "scheduled"),
        gte(consultations.scheduledAt, iso(now)),
        lt(consultations.scheduledAt, iso(new Date(now.getTime() + 14 * 86_400_000))),
      ),
    );

  return {
    activeCases: { current: row.active, previous: null }, // a snapshot, not a period
    newCases: { current: row.opened, previous: row.openedPrev },
    closedCases: { current: row.closed, previous: row.closedPrev },
    avgDaysToClose: { current: Math.round(row.avgDays), previous: Math.round(row.avgDaysPrev) },
    feesBooked: { current: row.fees, previous: row.feesPrev },
    upcomingConsultations: { current: upcoming, previous: null },
  };
});

/** Cases opened vs closed per week/month; empty buckets are filled with zero. */
export const getTrend = cache(async (r: ResolvedRange): Promise<TrendPoint[]> => {
  const unit = sql.raw(`'${r.bucket}'`); // from a closed set ("week" | "month"), never user text
  const step = sql.raw(`'1 ${r.bucket}'::interval`);
  const rows = await db().execute<{ start: string; opened: string; closed: string }>(sql`
    with buckets as (
      select generate_series(date_trunc(${unit}, ${iso(r.from)}::timestamptz at time zone 'UTC'),
                             (${iso(r.to)}::timestamptz at time zone 'UTC') - interval '1 second',
                             ${step}) as start
    )
    select to_char(b.start, 'YYYY-MM-DD') as start,
      (select count(*) from ${cases} c where c.opened_at >= greatest(b.start at time zone 'UTC', ${iso(r.from)}::timestamptz)
         and c.opened_at < least((b.start + ${step}) at time zone 'UTC', ${iso(r.to)}::timestamptz)) as opened,
      (select count(*) from ${cases} c where c.closed_at >= greatest(b.start at time zone 'UTC', ${iso(r.from)}::timestamptz)
         and c.closed_at < least((b.start + ${step}) at time zone 'UTC', ${iso(r.to)}::timestamptz)) as closed
    from buckets b
    order by b.start
  `);
  return Array.from(rows, (row) => ({ start: row.start, opened: Number(row.opened), closed: Number(row.closed) }));
});

export const getCasesByArea = cache(async (r: ResolvedRange): Promise<AreaPoint[]> => {
  const rows = await db()
    .select({ area: cases.practiceArea, count: count() })
    .from(cases)
    .where(and(gte(cases.openedAt, iso(r.from)), lt(cases.openedAt, iso(r.to))))
    .groupBy(cases.practiceArea)
    .orderBy(desc(count()));
  return rows;
});

/** Active cases per lawyer right now (not range-dependent). */
export const getWorkload = cache(async (): Promise<WorkloadPoint[]> => {
  return db()
    .select({ name: users.name, count: count() })
    .from(cases)
    .innerJoin(users, eq(cases.assigneeId, users.id))
    .where(ne(cases.status, "closed"))
    .groupBy(users.id, users.name)
    .orderBy(desc(count()));
});

export const getUpcomingConsultations = cache(async (): Promise<UpcomingConsultation[]> => {
  return db()
    .select({
      id: consultations.id,
      subject: consultations.subject,
      scheduledAt: consultations.scheduledAt,
      mode: consultations.mode,
      clientName: clients.name,
      caseId: cases.id,
      caseRef: cases.ref,
      lawyerName: users.name,
    })
    .from(consultations)
    .innerJoin(clients, eq(consultations.clientId, clients.id))
    .leftJoin(cases, eq(consultations.caseId, cases.id))
    .leftJoin(users, eq(consultations.lawyerId, users.id))
    .where(and(eq(consultations.status, "scheduled"), gte(consultations.scheduledAt, iso(new Date()))))
    .orderBy(asc(consultations.scheduledAt))
    .limit(6);
});

/** Everything at once, for GET /api/dashboard. Widgets run in parallel. */
export async function getDashboard(r: ResolvedRange): Promise<DashboardData> {
  const [kpis, trend, byArea, workload, upcoming] = await Promise.all([
    getKpis(r),
    getTrend(r),
    getCasesByArea(r),
    getWorkload(),
    getUpcomingConsultations(),
  ]);
  return {
    range: { from: iso(r.from), to: iso(r.to), label: r.label, bucket: r.bucket },
    kpis,
    trend,
    byArea,
    workload,
    upcoming,
  };
}
