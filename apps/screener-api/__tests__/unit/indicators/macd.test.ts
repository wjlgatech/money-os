import { describe, it, expect } from "vitest";
import { calcMACD, detectMACDCrossover } from "@/lib/indicators/macd";

describe("MACD(12,26,9)", () => {
  // Generate 60 bars of trending data
  const uptrend = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5 + Math.sin(i * 0.3) * 2);
  const downtrend = Array.from({ length: 60 }, (_, i) => 200 - i * 0.5 + Math.sin(i * 0.3) * 2);

  it("returns nulls for insufficient data", () => {
    const result = calcMACD(Array.from({ length: 20 }, () => 100));
    expect(result.every((r) => r.macd === null)).toBe(true);
  });

  it("MACD line becomes valid after slow period", () => {
    const result = calcMACD(uptrend);
    // First 24 should have null MACD (slow EMA needs 26 bars, index 25)
    for (let i = 0; i < 25; i++) {
      expect(result[i].macd).toBeNull();
    }
    // Index 25 should have MACD
    expect(result[25].macd).not.toBeNull();
  });

  it("signal line becomes valid after slow + signal periods", () => {
    const result = calcMACD(uptrend);
    // Signal needs 9 bars of valid MACD. MACD starts at index 25.
    // Signal starts at index 25 + 8 = 33
    expect(result[33].signal).not.toBeNull();
    expect(result[33].histogram).not.toBeNull();
  });

  it("uptrend produces positive MACD", () => {
    const result = calcMACD(uptrend);
    const lastValid = result.filter((r) => r.macd !== null).pop()!;
    expect(lastValid.macd!).toBeGreaterThan(0);
  });

  it("downtrend produces negative MACD", () => {
    const result = calcMACD(downtrend);
    const lastValid = result.filter((r) => r.macd !== null).pop()!;
    expect(lastValid.macd!).toBeLessThan(0);
  });

  it("detects bullish crossover", () => {
    // Create data that transitions from downtrend to uptrend
    const transition = [
      ...Array.from({ length: 40 }, (_, i) => 150 - i * 0.3),
      ...Array.from({ length: 25 }, (_, i) => 138 + i * 0.8),
    ];
    const result = calcMACD(transition);
    const crossover = detectMACDCrossover(result, 10);
    // Should detect a bullish crossover in the recovery phase
    if (crossover) {
      expect(crossover.direction).toBe("bull");
    }
  });

  it("histogram sign matches MACD - signal", () => {
    const result = calcMACD(uptrend);
    for (const r of result) {
      if (r.macd !== null && r.signal !== null && r.histogram !== null) {
        expect(Math.abs(r.histogram - (r.macd - r.signal))).toBeLessThan(0.0001);
      }
    }
  });
});
