import { calcRSI } from "../indicators/rsi";
import { calcMACD, detectMACDCrossover } from "../indicators/macd";
import { latestATR, type OHLCBar } from "../indicators/atr";
import { projectTrendline, type TrendlineCandidate } from "./trendlineEngine";

export interface Signal {
  ticker: string;
  timeframe: string;
  signalType: string;
  direction: "bull" | "bear";
  detail: string;
  entryPrice: number | null;
  stopPrice: number | null;
  signalDate: string;
}

/**
 * Generate trading signals for a ticker from its price data and trendlines.
 *
 * Signal types:
 * 1. RSI oversold (< 30) / overbought (> 70)
 * 2. MACD bullish/bearish crossover
 * 3. Bullish/bearish divergence (price vs RSI)
 * 4. Proximity to trendline (within 1 × ATR)
 */
export function generateSignals(
  ticker: string,
  timeframe: string,
  bars: Array<OHLCBar & { ts: string }>,
  trendlines: TrendlineCandidate[] = []
): Signal[] {
  if (bars.length < 30) return [];

  const signals: Signal[] = [];
  const closes = bars.map((b) => b.close);
  const lastBar = bars[bars.length - 1];
  const today = lastBar.ts.slice(0, 10);
  const atr = latestATR(bars) ?? 0;

  // ── RSI Signals ──────────────────────────────────────────
  const rsiValues = calcRSI(closes);
  const latestRSI = rsiValues[rsiValues.length - 1];

  if (latestRSI !== null) {
    if (latestRSI < 30) {
      signals.push({
        ticker,
        timeframe,
        signalType: "rsi_oversold",
        direction: "bull",
        detail: `RSI(14) = ${latestRSI.toFixed(1)} — oversold on ${timeframe}`,
        entryPrice: lastBar.close,
        stopPrice: atr > 0 ? Number((lastBar.close - 1.5 * atr).toFixed(2)) : null,
        signalDate: today,
      });
    }
    if (latestRSI > 70) {
      signals.push({
        ticker,
        timeframe,
        signalType: "rsi_overbought",
        direction: "bear",
        detail: `RSI(14) = ${latestRSI.toFixed(1)} — overbought on ${timeframe}`,
        entryPrice: null,
        stopPrice: null,
        signalDate: today,
      });
    }
  }

  // ── MACD Signals ─────────────────────────────────────────
  const macdResults = calcMACD(closes);
  const crossover = detectMACDCrossover(macdResults, 3);

  if (crossover) {
    signals.push({
      ticker,
      timeframe,
      signalType: `macd_${crossover.direction === "bull" ? "bullish" : "bearish"}`,
      direction: crossover.direction,
      detail: `MACD ${crossover.direction === "bull" ? "bullish" : "bearish"} crossover on ${timeframe} (${crossover.barsAgo} bar${crossover.barsAgo === 1 ? "" : "s"} ago)`,
      entryPrice: crossover.direction === "bull" ? lastBar.close : null,
      stopPrice:
        crossover.direction === "bull" && atr > 0
          ? Number((lastBar.close - 1.5 * atr).toFixed(2))
          : null,
      signalDate: today,
    });
  }

  // ── Divergence Signals ───────────────────────────────────
  const divergence = detectDivergence(closes, rsiValues);
  if (divergence) {
    signals.push({
      ticker,
      timeframe,
      signalType: "divergence",
      direction: divergence,
      detail: `${divergence === "bull" ? "Bullish" : "Bearish"} divergence: price ${divergence === "bull" ? "lower low" : "higher high"}, RSI ${divergence === "bull" ? "higher low" : "lower high"} on ${timeframe}`,
      entryPrice: divergence === "bull" ? lastBar.close : null,
      stopPrice: null,
      signalDate: today,
    });
  }

  // ── Proximity Signals ────────────────────────────────────
  if (atr > 0 && trendlines.length > 0) {
    const now = new Date(lastBar.ts);
    for (const tl of trendlines) {
      const projected = projectTrendline(tl, now);
      const distance = Math.abs(lastBar.close - projected);
      if (distance <= atr) {
        signals.push({
          ticker,
          timeframe: tl.timeframe,
          signalType: "proximity",
          direction: tl.type === "support" ? "bull" : "bear",
          detail: `Within 1×ATR of ${tl.timeframe} ${tl.type} at $${projected.toFixed(2)}`,
          entryPrice: tl.type === "support" ? lastBar.close : null,
          stopPrice:
            tl.type === "support" && atr > 0
              ? Number((projected - 0.5 * atr).toFixed(2))
              : null,
          signalDate: today,
        });
        break; // Only one proximity signal per ticker
      }
    }
  }

  return signals;
}

/**
 * Detect simple bullish/bearish divergence.
 * Bullish: price makes lower low, RSI makes higher low (in last 20 bars)
 * Bearish: price makes higher high, RSI makes lower high (in last 20 bars)
 */
function detectDivergence(
  closes: number[],
  rsiValues: (number | null)[],
  lookback: number = 20
): "bull" | "bear" | null {
  if (closes.length < lookback) return null;

  const start = closes.length - lookback;
  const recentCloses = closes.slice(start);
  const recentRSI = rsiValues.slice(start).filter((v): v is number => v !== null);

  if (recentRSI.length < 10) return null;

  // Find two lows in price and RSI
  const midpoint = Math.floor(recentCloses.length / 2);
  const firstHalf = recentCloses.slice(0, midpoint);
  const secondHalf = recentCloses.slice(midpoint);
  const firstHalfRSI = recentRSI.slice(0, Math.floor(recentRSI.length / 2));
  const secondHalfRSI = recentRSI.slice(Math.floor(recentRSI.length / 2));

  const priceFirstLow = Math.min(...firstHalf);
  const priceSecondLow = Math.min(...secondHalf);
  const rsiFirstLow = Math.min(...firstHalfRSI);
  const rsiSecondLow = Math.min(...secondHalfRSI);

  // Bullish divergence: price lower low, RSI higher low
  if (priceSecondLow < priceFirstLow && rsiSecondLow > rsiFirstLow) {
    return "bull";
  }

  // Bearish divergence: price higher high, RSI lower high
  const priceFirstHigh = Math.max(...firstHalf);
  const priceSecondHigh = Math.max(...secondHalf);
  const rsiFirstHigh = Math.max(...firstHalfRSI);
  const rsiSecondHigh = Math.max(...secondHalfRSI);

  if (priceSecondHigh > priceFirstHigh && rsiSecondHigh < rsiFirstHigh) {
    return "bear";
  }

  return null;
}
