import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiCards, percentChange } from "../kpi-cards";

describe("percentChange()", () => {
  it("is null without a fair baseline", () => {
    expect(percentChange({ current: 5, previous: null })).toBeNull();
    expect(percentChange({ current: 5, previous: 0 })).toBeNull();
  });
  it("rounds the change against the previous period", () => {
    expect(percentChange({ current: 150, previous: 120 })).toBe(25);
    expect(percentChange({ current: 90, previous: 120 })).toBe(-25);
  });
});

describe("<KpiCards>", () => {
  it("states whether a change is good or bad in words, not only colour", () => {
    render(
      <KpiCards
        kpis={{
          activeCases: { current: 197, previous: null },
          newCases: { current: 150, previous: 120 },
          closedCases: { current: 100, previous: 100 },
          avgDaysToClose: { current: 60, previous: 40 }, // slower closing is worse
          feesBooked: { current: 1_600_000, previous: 2_000_000 },
          upcomingConsultations: { current: 34, previous: null },
        }}
      />,
    );
    const tile = (name: string) => screen.getByText(name).closest("li")!;
    expect(tile("New cases")).toHaveTextContent("+25% vs previous period (improvement)");
    expect(tile("Avg. days to close")).toHaveTextContent("+50% vs previous period (decline)");
    expect(tile("Fixed fees booked")).toHaveTextContent("AED 1.6M");
    expect(tile("Active cases")).toHaveTextContent("Right now");
  });
});
