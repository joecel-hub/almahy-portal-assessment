import { ArrowDownRight, ArrowUpRight, Briefcase, CalendarClock, CheckCircle2, FolderPlus, Timer, Wallet, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCompactCurrency, formatNumber } from "@/lib/format";
import type { DashboardKpis, Kpi } from "@/lib/dashboard/types";

type Tile = {
  key: keyof DashboardKpis;
  label: string;
  icon: LucideIcon;
  format: (n: number) => string;
  /** Whether a rise is good news (drives the wording, never colour alone). */
  higherIsBetter: boolean;
  note?: string;
};

const TILES: Tile[] = [
  { key: "activeCases", label: "Active cases", icon: Briefcase, format: formatNumber, higherIsBetter: true, note: "Right now" },
  { key: "newCases", label: "New cases", icon: FolderPlus, format: formatNumber, higherIsBetter: true },
  { key: "closedCases", label: "Cases closed", icon: CheckCircle2, format: formatNumber, higherIsBetter: true },
  { key: "avgDaysToClose", label: "Avg. days to close", icon: Timer, format: (n) => `${n}d`, higherIsBetter: false },
  { key: "feesBooked", label: "Fixed fees booked", icon: Wallet, format: formatCompactCurrency, higherIsBetter: true },
  { key: "upcomingConsultations", label: "Consultations", icon: CalendarClock, format: formatNumber, higherIsBetter: true, note: "Next 14 days" },
];

/** Percentage change vs the previous period, or null when there is no fair comparison. */
export function percentChange({ current, previous }: Kpi): number | null {
  if (previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function Delta({ kpi, higherIsBetter }: { kpi: Kpi; higherIsBetter: boolean }) {
  const change = percentChange(kpi);
  if (change === null) return null;
  const up = change > 0;
  const good = change === 0 ? null : up === higherIsBetter;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <p
      className={
        good === null ? "text-xs text-muted-foreground" : good ? "text-xs text-success" : "text-xs text-destructive"
      }
    >
      {change !== 0 && <Icon className="mr-0.5 inline size-3.5 align-[-2px]" aria-hidden="true" />}
      <span className="font-medium tabular">
        {change > 0 ? "+" : ""}
        {change}%
      </span>{" "}
      <span className="text-muted-foreground">vs previous period</span>
      <span className="sr-only">{good === null ? "" : good ? " (improvement)" : " (decline)"}</span>
    </p>
  );
}

/** Server Component: no client JavaScript for the headline numbers. */
export function KpiCards({ kpis }: { kpis: DashboardKpis }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" aria-label="Key figures">
      {TILES.map(({ key, label, icon: Icon, format, higherIsBetter, note }) => (
        <li key={key}>
          <Card className="h-full gap-2 px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-2xl font-semibold tracking-tight tabular">{format(kpis[key].current)}</p>
            {note ? <p className="text-xs text-muted-foreground">{note}</p> : <Delta kpi={kpis[key]} higherIsBetter={higherIsBetter} />}
          </Card>
        </li>
      ))}
    </ul>
  );
}
