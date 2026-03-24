import { describe, it, expect } from "vitest";
import { calcRSI, latestRSI } from "@/lib/indicators/rsi";

describe("RSI(14)", () => {
  it("returns nulls for fewer than 2 data points", () => {
    expect(calcRSI([100])).toEqual([null]);
    expect(calcRSI([])).toEqual([]);
  });

  it("returns nulls when insufficient data for period", () => {
    const closes = Array.from({ length: 10 }, (_, i) => 100 + i);
    const result = calcRSI(closes, 14);
    expect(result.every((v) => v === null)).toBe(true);
  });

  it("computes first RSI correctly", () => {
    // 20 bars, need 15 for first RSI (14 changes + 1)
    const closes = Array.from({ length: 20 }, (_, i) => 100 + Math.sin(i) * 5);
    const result = calcRSI(closes, 14);

    // First 14 values should be null (index 0 + 13 insufficient)
    for (let i = 0; i < 14; i++) {
      expect(result[i]).toBeNull();
    }

    // Index 14 should have first RSI
    expect(result[14]).not.toBeNull();
    expect(result[14]!).toBeGreaterThanOrEqual(0);
    expect(result[14]!).toBeLessThanOrEqual(100);
  });

  it("all-up prices produce RSI = 100", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    const result = calcRSI(closes, 14);
    const lastRSI = result[result.length - 1];
    expect(lastRSI).toBe(100);
  });

  it("all-down prices produce RSI near 0", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 200 - i);
    const result = calcRSI(closes, 14);
    const lastRSI = result[result.length - 1];
    expect(lastRSI).not.toBeNull();
    expect(lastRSI!).toBeLessThan(1);
  });

  it("detects oversold condition (RSI < 30)", () => {
    // Sharp drop then flat
    const closes = [
      ...Array.from({ length: 10 }, () => 100),
      ...Array.from({ length: 10 }, (_, i) => 100 - (i + 1) * 3),
    ];
    const result = calcRSI(closes, 14);
    const lastRSI = result.filter((v) => v !== null).pop()!;
    expect(lastRSI).toBeLessThan(30);
  });

  it("latestRSI returns the last valid value", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + Math.sin(i) * 5);
    const latest = latestRSI(closes, 14);
    expect(latest).not.toBeNull();
    expect(latest!).toBeGreaterThanOrEqual(0);
    expect(latest!).toBeLessThanOrEqual(100);
  });
});
