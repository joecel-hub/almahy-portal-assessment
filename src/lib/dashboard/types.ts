import type { ConsultationMode, PracticeArea } from "@/lib/domain";

export type Kpi = { current: number; previous: number | null };

export type DashboardKpis = {
  activeCases: Kpi;
  newCases: Kpi;
  closedCases: Kpi;
  avgDaysToClose: Kpi;
  feesBooked: Kpi;
  upcomingConsultations: Kpi;
};

export type TrendPoint = { start: string; opened: number; closed: number };
export type AreaPoint = { area: PracticeArea; count: number };
export type WorkloadPoint = { name: string; count: number };
export type UpcomingConsultation = {
  id: number;
  subject: string;
  scheduledAt: string;
  mode: ConsultationMode;
  clientName: string;
  caseId: number | null;
  caseRef: string | null;
  lawyerName: string | null;
};

export type DashboardData = {
  range: { from: string; to: string; label: string; bucket: "week" | "month" };
  kpis: DashboardKpis;
  trend: TrendPoint[];
  byArea: AreaPoint[];
  workload: WorkloadPoint[];
  upcoming: UpcomingConsultation[];
};
