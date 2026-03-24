import { findPivots, type TimedOHLCBar, type Pivot } from "../indicators/zigzag";
import { latestATR } from "../indicators/atr";

export interface TrendlineCandidate {
  ticker: string;
  timeframe: string;
  type: "support" | "resistance";
  x1Ts: string;
  x2Ts: string;
  y1: number;
  y2: number;
  slope: number; // price change per millisecond
  touches: number;
  score: number;
}

/**
 * Compute trendlines for a single ticker/timeframe.
 *
 * Algorithm:
 * 1. Find zigzag pivots
 * 2. Generate all pivot-pair line candidates (same type)
 * 3. Score each line by: touches × recency × slope quality
 * 4. Keep top K lines
 * 5. Classify support vs resistance
 */
export function computeTrendlines(
  ticker: string,
  timeframe: string,
  bars: TimedOHLCBar[],
  topK: number = 5
): TrendlineCandidate[] {
  if (bars.length < 20) return [];

  const pivots = findPivots(bars, 5, 0.3);
  if (pivots.length < 2) return [];

  const atr = latestATR(bars) ?? 1;
  const latestTs = new Date(bars[bars.length - 1].ts).getTime();
  const totalSpanMs = latestTs - new Date(bars[0].ts).getTime();
  if (totalSpanMs === 0) return [];

  const candidates: TrendlineCandidate[] = [];

  // Generate candidates from pivot pairs of the same type
  const highPivots = pivots.filter((p) => p.type === "high");
  const lowPivots = pivots.filter((p) => p.type === "low");

  // Support lines: connect low pivots
  for (let i = 0; i < lowPivots.length; i++) {
    for (let j = i + 1; j < lowPivots.length; j++) {
      const line = scoreLine(
        ticker,
        timeframe,
        lowPivots[i],
        lowPivots[j],
        "support",
        bars,
        atr,
        latestTs,
        totalSpanMs
      );
      if (line) candidates.push(line);
    }
  }

  // Resistance lines: connect high pivots
  for (let i = 0; i < highPivots.length; i++) {
    for (let j = i + 1; j < highPivots.length; j++) {
      const line = scoreLine(
        ticker,
        timeframe,
        highPivots[i],
        highPivots[j],
        "resistance",
        bars,
        atr,
        latestTs,
        totalSpanMs
      );
      if (line) candidates.push(line);
    }
  }

  // Sort by score descending, take top K
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, topK);
}

function scoreLine(
  ticker: string,
  timeframe: string,
  p1: Pivot,
  p2: Pivot,
  type: "support" | "resistance",
  bars: TimedOHLCBar[],
  atr: number,
  latestTs: number,
  totalSpanMs: number
): TrendlineCandidate | null {
  const t1 = new Date(p1.ts).getTime();
  const t2 = new Date(p2.ts).getTime();
  const dt = t2 - t1;
  if (dt === 0) return null;

  const slope = (p2.price - p1.price) / dt;

  // Count touches: bars whose high or low is within 0.5 × ATR of the line
  const touchThreshold = atr * 0.5;
  let touches = 0;

  for (const bar of bars) {
    const barTs = new Date(bar.ts).getTime();
    const projectedPrice = p1.price + slope * (barTs - t1);
    const priceToCheck = type === "support" ? bar.low : bar.high;
    if (Math.abs(priceToCheck - projectedPrice) <= touchThreshold) {
      touches++;
    }
  }

  // Recency weight: lines that extend closer to present score higher
  const newerPivotTs = Math.max(t1, t2);
  const recency = newerPivotTs / latestTs; // 0 to 1, higher = more recent

  // Length bonus: longer lines are more significant
  const lengthRatio = dt / totalSpanMs;

  // Slope quality: gentler slopes are more reliable than steep ones
  const slopeQuality = 1 / (1 + Math.abs(slope) * 86400000 * 30); // penalize steep 30-day slopes

  const score =
    touches * 2 +
    recency * 3 +
    lengthRatio * 2 +
    slopeQuality * 1;

  return {
    ticker,
    timeframe,
    type,
    x1Ts: p1.ts,
    x2Ts: p2.ts,
    y1: p1.price,
    y2: p2.price,
    slope,
    touches,
    score,
  };
}

/**
 * Project a trendline to a target date.
 * Returns the projected price at that date.
 */
export function projectTrendline(
  trendline: { x1Ts: string; y1: number; slope: number },
  targetDate: Date = new Date()
): number {
  const t1 = new Date(trendline.x1Ts).getTime();
  const target = targetDate.getTime();
  return trendline.y1 + trendline.slope * (target - t1);
}
