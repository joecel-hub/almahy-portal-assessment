"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Recharts is the heaviest dependency in the app. Loading it lazily keeps it
// out of every other page's bundle and off the critical path: the numbers
// (KPIs, tables) render first, the charts fill in as their chunk arrives.
const chartSkeleton = (height: string) => {
  function ChartSkeleton() {
    return <Skeleton className={`w-full ${height}`} />;
  }
  return ChartSkeleton;
};

export const TrendChart = dynamic(() => import("./charts").then((m) => m.TrendChart), {
  ssr: false,
  loading: chartSkeleton("h-80"),
});
export const AreaChart = dynamic(() => import("./charts").then((m) => m.AreaChart), {
  ssr: false,
  loading: chartSkeleton("h-56"),
});
export const WorkloadChart = dynamic(() => import("./charts").then((m) => m.WorkloadChart), {
  ssr: false,
  loading: chartSkeleton("h-56"),
});
