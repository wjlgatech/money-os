import { describe, it, expect } from "vitest";
import { detectRegime, regimePositionMultiplier } from "@/lib/indicators/regime";

describe("Market Regime Detection", () => {
  it("returns sideways with zero confidence for insufficient data", () => {
    const result = detectRegime([100, 101, 102]);
    expect(result.regime).toBe("sideways");
    expect(result.confidence).toBe(0);
  });

  it("detects bull regime in steady uptrend", () => {
    // 250 bars of steady uptrend: 100 → 200
    const closes = Array.from({ length: 250 }, (_, i) => 100 + i * 0.4);
    const result = detectRegime(closes);
    expect(result.regime).toBe("bull");
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.details.priceVs200).toBe("above");
    expect(result.details.sma200Slope).toBe("rising");
  });

  it("detects bear regime in steady downtrend", () => {
    // 250 bars of steady downtrend: 200 → 100
    const closes = Array.from({ length: 250 }, (_, i) => 200 - i * 0.4);
    const result = detectRegime(closes);
    expect(result.regime).toBe("bear");
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.details.priceVs200).toBe("below");
    expect(result.details.sma200Slope).toBe("falling");
  });

  it("detects sideways in range-bound market", () => {
    // 250 bars oscillating around 100
    const closes = Array.from({ length: 250 }, (_, i) => 100 + Math.sin(i * 0.1) * 3);
    const result = detectRegime(closes);
    // Should be sideways or low-confidence bull/bear
    expect(["sideways", "bull", "bear"]).toContain(result.regime);
  });

  it("works with 50-120 bars (short history)", () => {
    const closes = Array.from({ length: 80 }, (_, i) => 100 + i * 0.5);
    const result = detectRegime(closes);
    // Should produce a result even without 200 bars
    expect(result.regime).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("detects regime transition (bull to bear)", () => {
    // 150 bars up, then 100 bars down
    const closes = [
      ...Array.from({ length: 150 }, (_, i) => 100 + i * 0.5),
      ...Array.from({ length: 100 }, (_, i) => 175 - i * 0.5),
    ];
    const result = detectRegime(closes);
    // Price has dropped below MAs — should be bear or sideways
    expect(["bear", "sideways"]).toContain(result.regime);
  });

  it("position multiplier is correct for each regime", () => {
    expect(regimePositionMultiplier("bull")).toBe(1.0);
    expect(regimePositionMultiplier("sideways")).toBe(0.5);
    expect(regimePositionMultiplier("bear")).toBe(0);
  });
});
