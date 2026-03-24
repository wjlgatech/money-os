/**
 * Market Regime Detection
 *
 * Determines whether the market is in a bull, bear, or sideways regime.
 * Used to gate entry signals — don't buy support bounces in a bear market.
 *
 * Three signals, combined:
 * 1. Price vs 200-day SMA: above = bullish, below = bearish
 * 2. 50-day SMA vs 200-day SMA: golden cross (bull) vs death cross (bear)
 * 3. 200-day SMA slope: rising = bull, falling = bear, flat = sideways
 */

export type Regime = "bull" | "bear" | "sideways";

export interface RegimeResult {
  regime: Regime;
  confidence: number;        // 0 to 1
  details: {
    priceVs200: "above" | "below";
    sma50Vs200: "golden_cross" | "death_cross" | "converging";
    sma200Slope: "rising" | "falling" | "flat";
    currentPrice: number;
    sma50: number;
    sma200: number;
    sma200SlopeValue: number;  // price change per day
  };
}

function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

/**
 * Detect market regime from daily closing prices.
 * Requires at least 200 bars for full confidence.
 * Falls back to 50-bar analysis if fewer bars available.
 */
export function detectRegime(closes: number[]): RegimeResult {
  if (closes.length < 50) {
    return {
      regime: "sideways",
      confidence: 0,
      details: {
        priceVs200: "above",
        sma50Vs200: "converging",
        sma200Slope: "flat",
        currentPrice: closes[closes.length - 1] ?? 0,
        sma50: 0,
        sma200: 0,
        sma200SlopeValue: 0,
      },
    };
  }

  const currentPrice = closes[closes.length - 1];
  const sma50Val = sma(closes, 50)!;

  // Use 200-day if available, otherwise use 100-day as proxy
  const longPeriod = closes.length >= 200 ? 200 : Math.min(closes.length, 100);
  const smaLongVal = sma(closes, longPeriod)!;

  // 200-day SMA slope: compare current 200-SMA to 20 bars ago
  const smaLong20Ago = closes.length >= longPeriod + 20
    ? sma(closes.slice(0, -20), longPeriod)
    : smaLongVal;
  const slopePerDay = smaLong20Ago ? (smaLongVal - smaLong20Ago) / 20 : 0;

  // Signal 1: Price vs long SMA
  const priceVs200: "above" | "below" = currentPrice > smaLongVal ? "above" : "below";

  // Signal 2: 50 SMA vs long SMA
  const smaDiff = sma50Val - smaLongVal;
  const smaDiffPct = Math.abs(smaDiff) / smaLongVal;
  let sma50Vs200: "golden_cross" | "death_cross" | "converging";
  if (smaDiffPct < 0.005) {
    sma50Vs200 = "converging"; // within 0.5% = basically touching
  } else if (smaDiff > 0) {
    sma50Vs200 = "golden_cross";
  } else {
    sma50Vs200 = "death_cross";
  }

  // Signal 3: Long SMA slope
  const slopePctPerDay = smaLongVal > 0 ? slopePerDay / smaLongVal : 0;
  let sma200Slope: "rising" | "falling" | "flat";
  if (slopePctPerDay > 0.0002) {       // ~0.02%/day = ~5%/year
    sma200Slope = "rising";
  } else if (slopePctPerDay < -0.0002) {
    sma200Slope = "falling";
  } else {
    sma200Slope = "flat";
  }

  // ── Combine signals into regime ─────────────────────────

  let bullScore = 0;
  let bearScore = 0;

  // Price above long SMA is the strongest signal
  if (priceVs200 === "above") bullScore += 2;
  else bearScore += 2;

  // Golden/death cross
  if (sma50Vs200 === "golden_cross") bullScore += 1.5;
  else if (sma50Vs200 === "death_cross") bearScore += 1.5;

  // Slope direction
  if (sma200Slope === "rising") bullScore += 1;
  else if (sma200Slope === "falling") bearScore += 1;

  const totalScore = bullScore + bearScore;
  let regime: Regime;
  let confidence: number;

  if (bullScore >= 3.5) {
    regime = "bull";
    confidence = Math.min(bullScore / 4.5, 1);
  } else if (bearScore >= 3.5) {
    regime = "bear";
    confidence = Math.min(bearScore / 4.5, 1);
  } else {
    regime = "sideways";
    confidence = 1 - Math.abs(bullScore - bearScore) / totalScore;
  }

  return {
    regime,
    confidence: Number(confidence.toFixed(2)),
    details: {
      priceVs200,
      sma50Vs200,
      sma200Slope,
      currentPrice,
      sma50: Number(sma50Val.toFixed(2)),
      sma200: Number(smaLongVal.toFixed(2)),
      sma200SlopeValue: Number(slopePerDay.toFixed(4)),
    },
  };
}

/**
 * Should we allow long entries in this regime?
 *
 * - Bull: yes (full position size)
 * - Sideways: yes but reduced size (50%)
 * - Bear: no (unless explicitly overridden)
 */
export function regimePositionMultiplier(regime: Regime): number {
  switch (regime) {
    case "bull": return 1.0;
    case "sideways": return 0.5;
    case "bear": return 0;
  }
}
