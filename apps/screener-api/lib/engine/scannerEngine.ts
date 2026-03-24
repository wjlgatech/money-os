import { projectTrendline, type TrendlineCandidate } from "./trendlineEngine";

export interface ScanResult {
  ticker: string;
  asset: string;
  price: number;
  signalType: "TL" | "IX";
  level: number;
  distanceAtr: number;
  distanceUsd: number;
  zone: "ENTRY" | "ALERT" | null;
  timeframe: string;
  direction: "support" | "resistance";
  sector: string | null;
}

/**
 * Run the scanner engine for a single ticker.
 *
 * For each active trendline, project to current date and compute:
 * - Distance from current price in ATR units
 * - Zone classification (ENTRY / ALERT / none)
 * - Intersection detection (weekly + daily converge within 0.5 ATR)
 *
 * VIX adjustment: adjustedATR = ATR × (VIX / 20)
 */
export function scanTicker(
  ticker: string,
  asset: string,
  currentPrice: number,
  atr: number,
  vix: number,
  trendlines: TrendlineCandidate[],
  sector: string | null = null,
  scanDate: Date = new Date()
): ScanResult[] {
  if (atr === 0 || trendlines.length === 0) return [];

  const volFactor = vix / 20;
  const adjustedATR = atr * volFactor;
  const results: ScanResult[] = [];

  // Project each trendline to current date
  const projections = trendlines.map((tl) => ({
    trendline: tl,
    projectedPrice: projectTrendline(tl, scanDate),
  }));

  // Check for intersections: weekly + daily lines converging within 0.5 ATR
  const weeklyProjections = projections.filter(
    (p) => p.trendline.timeframe === "weekly"
  );
  const dailyProjections = projections.filter(
    (p) => p.trendline.timeframe === "daily"
  );

  const intersections = new Set<string>();
  for (const wp of weeklyProjections) {
    for (const dp of dailyProjections) {
      if (
        Math.abs(wp.projectedPrice - dp.projectedPrice) <=
        0.5 * adjustedATR
      ) {
        intersections.add(
          `${wp.trendline.timeframe}-${wp.trendline.type}`
        );
        intersections.add(
          `${dp.trendline.timeframe}-${dp.trendline.type}`
        );
      }
    }
  }

  for (const { trendline, projectedPrice } of projections) {
    const distance = Math.abs(currentPrice - projectedPrice);
    const distanceAtr = distance / adjustedATR;

    // Zone classification
    let zone: "ENTRY" | "ALERT" | null = null;
    if (distanceAtr <= 1.0) {
      zone = "ENTRY";
    } else if (distanceAtr <= 1.5) {
      zone = "ALERT";
    }

    if (!zone) continue; // Skip if not in any zone

    const key = `${trendline.timeframe}-${trendline.type}`;
    const isIntersection = intersections.has(key);

    results.push({
      ticker,
      asset,
      price: currentPrice,
      signalType: isIntersection ? "IX" : "TL",
      level: Number(projectedPrice.toFixed(4)),
      distanceAtr: Number(distanceAtr.toFixed(4)),
      distanceUsd: Number(distance.toFixed(4)),
      zone,
      timeframe: trendline.timeframe,
      direction: trendline.type,
      sector,
    });
  }

  return results;
}
