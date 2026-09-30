import { createLoader, parseAsIsoDate, parseAsStringLiteral, type inferParserType } from "nuqs/server";

/**
 * The dashboard's date range lives in the URL (?range=90d, or
 * ?range=custom&from=2026-01-01&to=2026-03-31), so a filtered dashboard can be
 * bookmarked or shared. Shared by the page, the API route and the filter UI.
 */
export const RANGE_PRESETS = ["30d", "90d", "6m", "12m", "ytd", "custom"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const RANGE_LABELS: Record<RangePreset, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "6m": "Last 6 months",
  "12m": "Last 12 months",
  ytd: "Year to date",
  custom: "Custom",
};

export const dashboardSearchParams = {
  range: parseAsStringLiteral(RANGE_PRESETS).withDefault("12m"),
  from: parseAsIsoDate,
  to: parseAsIsoDate,
};
export type DashboardParams = inferParserType<typeof dashboardSearchParams>;
export const loadDashboardParams = createLoader(dashboardSearchParams);

export type ResolvedRange = {
  preset: RangePreset;
  /** Inclusive start (00:00 UTC). */
  from: Date;
  /** Exclusive end (00:00 UTC the day after the last day). */
  to: Date;
  /** The equally long period just before, for "vs previous period" deltas. */
  previousFrom: Date;
  /** Chart granularity: weeks for short ranges, months otherwise. */
  bucket: "week" | "month";
  label: string;
};

const DAY = 86_400_000;
const startOfDayUtc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const MAX_RANGE_DAYS = 366 * 3;

/**
 * Turns URL params into concrete dates. Pure (takes `now`), so it is easy to
 * test. Invalid custom ranges (missing, reversed, or longer than 3 years)
 * fall back to the default instead of erroring.
 */
export function resolveRange(params: DashboardParams, now = new Date()): ResolvedRange {
  const tomorrow = new Date(startOfDayUtc(now).getTime() + DAY);
  let preset = params.range;
  let from: Date;
  let to = tomorrow;

  if (preset === "custom") {
    const valid =
      params.from &&
      params.to &&
      params.from <= params.to &&
      (params.to.getTime() - params.from.getTime()) / DAY <= MAX_RANGE_DAYS;
    if (valid) {
      from = startOfDayUtc(params.from!);
      to = new Date(startOfDayUtc(params.to!).getTime() + DAY);
    } else {
      preset = "12m";
    }
  }

  if (preset !== "custom") {
    const today = startOfDayUtc(now);
    switch (preset) {
      case "30d":
        from = new Date(tomorrow.getTime() - 30 * DAY);
        break;
      case "90d":
        from = new Date(tomorrow.getTime() - 90 * DAY);
        break;
      case "6m":
        from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));
        break;
      case "ytd":
        from = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
        break;
      default:
        from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1));
    }
  }

  const length = to.getTime() - from!.getTime();
  const days = Math.round(length / DAY);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  return {
    preset,
    from: from!,
    to,
    previousFrom: new Date(from!.getTime() - length),
    bucket: days <= 92 ? "week" : "month",
    label: preset === "custom" ? `${fmt(from!)} – ${fmt(new Date(to.getTime() - DAY))}` : RANGE_LABELS[preset],
  };
}
