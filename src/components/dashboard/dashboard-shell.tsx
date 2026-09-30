"use client";

import { useState, useTransition } from "react";
import { useQueryStates } from "nuqs";
import { CalendarRange, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RANGE_LABELS, RANGE_PRESETS, dashboardSearchParams, type RangePreset } from "@/lib/dashboard/range";
import { cn } from "@/lib/utils";

const toYmd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/**
 * Wraps the dashboard. Changing the range updates the URL *non-shallowly*, so
 * the Server Components re-run their queries for the new range. That happens
 * inside a React transition: the current numbers stay on screen (dimmed)
 * until the new ones are ready, instead of flashing back to skeletons.
 */
export function DashboardShell({ rangeLabel, children }: { rangeLabel: string; children: React.ReactNode }) {
  const [isPending, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(dashboardSearchParams, {
    shallow: false,
    history: "push",
    startTransition,
  });
  const [custom, setCustom] = useState({ from: toYmd(params.from), to: toYmd(params.to) });
  const [showCustom, setShowCustom] = useState(params.range === "custom");
  const customInvalid = !custom.from || !custom.to || custom.from > custom.to;

  function choose(preset: RangePreset) {
    if (preset === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    void setParams({ range: preset, from: null, to: null });
  }

  function applyCustom(e: React.FormEvent) {
    e.preventDefault();
    if (customInvalid) return;
    void setParams({ range: "custom", from: new Date(custom.from), to: new Date(custom.to) });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 pr-1 text-sm font-medium">
            <CalendarRange className="size-4 text-muted-foreground" aria-hidden="true" /> Period
          </span>
          <div role="group" aria-label="Date range" className="flex flex-wrap gap-1">
            {RANGE_PRESETS.map((preset) => {
              const active = preset === "custom" ? showCustom : !showCustom && params.range === preset;
              return (
                <Button
                  key={preset}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "ghost"}
                  aria-pressed={active}
                  onClick={() => choose(preset)}
                >
                  {RANGE_LABELS[preset]}
                </Button>
              );
            })}
          </div>
          <span className="ml-auto flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Updating…
              </>
            ) : (
              <>Showing: {rangeLabel}</>
            )}
          </span>
        </div>

        {/* Conditional custom range inputs */}
        {showCustom && (
          <form onSubmit={applyCustom} className="flex flex-wrap items-end gap-3 border-t pt-3 animate-in fade-in-0">
            <div className="space-y-1.5">
              <Label htmlFor="range-from">From</Label>
              <Input
                id="range-from"
                type="date"
                value={custom.from}
                max={custom.to || undefined}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="range-to">To</Label>
              <Input
                id="range-to"
                type="date"
                value={custom.to}
                min={custom.from || undefined}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                className="w-40"
              />
            </div>
            <Button type="submit" size="sm" disabled={customInvalid}>
              Apply
            </Button>
            {custom.from && custom.to && custom.from > custom.to && (
              <p className="text-sm text-destructive" role="alert">
                The start date must be before the end date.
              </p>
            )}
          </form>
        )}
      </div>

      <div
        aria-busy={isPending}
        className={cn("space-y-6 transition-opacity duration-200", isPending && "pointer-events-none opacity-60")}
      >
        {children}
      </div>
    </div>
  );
}
