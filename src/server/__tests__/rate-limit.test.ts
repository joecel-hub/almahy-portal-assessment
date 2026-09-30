// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { recordFailure, resetRateLimit, retryAfter } = await import("../rate-limit");

describe("login rate limiter", () => {
  it("blocks only after the failure limit is reached", () => {
    const key = "test:a";
    for (let i = 0; i < 2; i++) recordFailure(key, 60_000);
    expect(retryAfter(key, 3)).toBe(0);
    recordFailure(key, 60_000);
    expect(retryAfter(key, 3)).toBeGreaterThan(0);
  });

  it("unblocks after a reset (successful login)", () => {
    const key = "test:b";
    for (let i = 0; i < 3; i++) recordFailure(key, 60_000);
    resetRateLimit(key);
    expect(retryAfter(key, 3)).toBe(0);
  });

  it("forgets failures once the window has passed", () => {
    vi.useFakeTimers();
    const key = "test:c";
    for (let i = 0; i < 3; i++) recordFailure(key, 1_000);
    vi.advanceTimersByTime(1_001);
    expect(retryAfter(key, 3)).toBe(0);
    vi.useRealTimers();
  });
});
