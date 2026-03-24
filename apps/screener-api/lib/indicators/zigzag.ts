import { type OHLCBar, latestATR } from "./atr";

export interface Pivot {
  index: number;
  type: "high" | "low";
  price: number;
  ts: string; // ISO timestamp from the bar
}

export interface TimedOHLCBar extends OHLCBar {
  ts: string;
}

/**
 * Detect zigzag pivot highs and lows.
 *
 * A pivot high at index i means bars[i].high is the highest high
 * in the window [i - lookback, i + lookback].
 *
 * A pivot low at index i means bars[i].low is the lowest low
 * in the window [i - lookback, i + lookback].
 *
 * Optionally filters pivots by ATR significance: the swing
 * must be at least `atrMultiplier * ATR` to count.
 */
export function findPivots(
  bars: TimedOHLCBar[],
  lookback: number = 5,
  atrMultiplier: number = 0.5
): Pivot[] {
  if (bars.length < lookback * 2 + 1) return [];

  const pivots: Pivot[] = [];
  const atr = latestATR(bars) ?? 1; // fallback to 1 if can't compute
  const minSwing = atr * atrMultiplier;

  for (let i = lookback; i < bars.length - lookback; i++) {
    let isHigh = true;
    let isLow = true;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (bars[j].high >= bars[i].high) isHigh = false;
      if (bars[j].low <= bars[i].low) isLow = false;
    }

    if (isHigh) {
      // Check ATR significance: distance from nearest low pivot
      const lastLowPivot = [...pivots].reverse().find((p) => p.type === "low");
      if (!lastLowPivot || bars[i].high - lastLowPivot.price >= minSwing) {
        pivots.push({
          index: i,
          type: "high",
          price: bars[i].high,
          ts: bars[i].ts,
        });
      }
    }

    if (isLow) {
      const lastHighPivot = [...pivots].reverse().find((p) => p.type === "high");
      if (!lastHighPivot || lastHighPivot.price - bars[i].low >= minSwing) {
        pivots.push({
          index: i,
          type: "low",
          price: bars[i].low,
          ts: bars[i].ts,
        });
      }
    }
  }

  return pivots;
}
