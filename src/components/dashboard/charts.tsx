"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AreaPoint, TrendPoint, WorkloadPoint } from "@/lib/dashboard/types";
import { PRACTICE_AREA_LABELS } from "@/lib/domain";

/*
 * Chart styling follows one set of rules: thin 2px lines, rounded bar ends,
 * recessive grid and axes in muted ink, text never in series colour, and a
 * hover tooltip on every chart. Colours come from CSS tokens, so dark mode
 * uses its own validated steps.
 */
const AXIS = { stroke: "var(--muted-foreground)", fontSize: 12, tickLine: false, axisLine: false } as const;

type TooltipProps = {
  active?: boolean;
  payload?: readonly { dataKey?: unknown; name?: unknown; value?: unknown; color?: string }[];
  label?: unknown;
  format?: (label: string) => string;
};

function ChartTooltip({ active, payload, label, format }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{format ? format(String(label)) : String(label)}</p>
      {payload.map((item) => (
        <p key={String(item.dataKey)} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2.5 rounded-sm" style={{ background: item.color }} aria-hidden="true" />
          {String(item.name)}
          <span className="ml-auto pl-4 font-medium text-foreground tabular">{String(item.value)}</span>
        </p>
      ))}
    </div>
  );
}

const bucketLabel = (bucket: "week" | "month") => (start: string) => {
  const d = new Date(`${start}T00:00:00Z`);
  return bucket === "month"
    ? d.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
};

const SERIES = [
  { key: "opened", name: "Opened", color: "var(--series-1)" },
  { key: "closed", name: "Closed", color: "var(--series-2)" },
] as const;

export function TrendChart({ data, bucket }: { data: TrendPoint[]; bucket: "week" | "month" }) {
  const format = bucketLabel(bucket);
  const last = data.length - 1;
  // Direct labels at the line ends: the higher series is nudged up and the
  // lower one down, so the two labels never overlap when values are close.
  const end = data[last];
  const higher = end && end.opened >= end.closed ? "opened" : "closed";
  return (
    <div className="space-y-3">
      {/* Legend: two series, so identity is never colour-only (also direct-labelled at the line ends). */}
      <ul className="flex gap-4 text-xs text-muted-foreground" aria-hidden="true">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 84, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="start" tickFormatter={format} minTickGap={24} {...AXIS} />
            <YAxis allowDecimals={false} width={40} {...AXIS} />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
              content={({ active, payload, label }) => (
                <ChartTooltip active={active} payload={payload} label={label} format={format} />
              )}
            />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                isAnimationActive
                animationDuration={500}
              >
                <LabelList
                  dataKey={s.key}
                  content={({ index, x, y, value }) =>
                    index === last ? (
                      <text
                        x={Number(x) + 8}
                        y={Number(y)}
                        dy={s.key === higher ? -4 : 12}
                        fontSize={12}
                        fill="var(--muted-foreground)"
                      >
                        {s.name} {value}
                      </text>
                    ) : null
                  }
                />
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Horizontal bars: magnitude by category, one hue, value labels at the bar end. */
function HorizontalBars({ data, name }: { data: { label: string; count: number }[]; name: string }) {
  return (
    <div style={{ height: Math.max(160, data.length * 36) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={6}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={140} {...AXIS} />
          <Tooltip cursor={{ fill: "var(--muted)" }} content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload} label={label} />} />
          <Bar dataKey="count" name={name} fill="var(--primary)" radius={[0, 4, 4, 0]} animationDuration={500}>
            <LabelList dataKey="count" position="right" fontSize={12} fill="var(--muted-foreground)" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AreaChart({ data }: { data: AreaPoint[] }) {
  return (
    <HorizontalBars name="Cases" data={data.map((d) => ({ label: PRACTICE_AREA_LABELS[d.area], count: d.count }))} />
  );
}

export function WorkloadChart({ data }: { data: WorkloadPoint[] }) {
  return <HorizontalBars name="Active cases" data={data.map((d) => ({ label: d.name, count: d.count }))} />;
}
