import { describe, it, expect } from "vitest";
import { calcATR, latestATR, type OHLCBar } from "@/lib/indicators/atr";

describe("ATR(14)", () => {
  it("returns empty array for empty input", () => {
    expect(calcATR([])).toEqual([]);
  });

  it("returns null for single bar", () => {
    expect(calcATR([{ high: 10, low: 8, close: 9 }])).toEqual([null]);
  });

  it("returns nulls for fewer bars than period", () => {
    const bars: OHLCBar[] = Array.from({ length: 10 }, (_, i) => ({
      high: 100 + i,
      low: 98 + i,
      close: 99 + i,
    }));
    const result = calcATR(bars, 14);
    expect(result.every((v) => v === null)).toBe(true);
  });

  it("computes correct ATR for known data", () => {
    // 20 bars with increasing volatility
    const bars: OHLCBar[] = Array.from({ length: 20 }, (_, i) => ({
      high: 100 + i * 2 + (i % 3),
      low: 100 + i * 2 - (i % 3) - 1,
      close: 100 + i * 2,
    }));
    const result = calcATR(bars, 14);

    // First 13 should be null
    for (let i = 0; i < 13; i++) {
      expect(result[i]).toBeNull();
    }

    // Bar 13 (index 13) should have a value — first ATR
    expect(result[13]).not.toBeNull();
    expect(result[13]!).toBeGreaterThan(0);

    // ATR should be positive and reasonable
    for (let i = 13; i < result.length; i++) {
      expect(result[i]).not.toBeNull();
      expect(result[i]!).toBeGreaterThan(0);
      expect(result[i]!).toBeLessThan(50); // sanity bound
    }
  });

  it("handles flat prices (zero volatility)", () => {
    const bars: OHLCBar[] = Array.from({ length: 20 }, () => ({
      high: 100,
      low: 100,
      close: 100,
    }));
    const result = calcATR(bars, 14);
    // ATR should be 0 for flat prices
    expect(result[13]).toBe(0);
  });

  it("latestATR returns the last non-null ATR", () => {
    const bars: OHLCBar[] = Array.from({ length: 20 }, (_, i) => ({
      high: 100 + i + 2,
      low: 100 + i - 1,
      close: 100 + i,
    }));
    const latest = latestATR(bars, 14);
    expect(latest).not.toBeNull();
    expect(latest!).toBeGreaterThan(0);
  });
});
