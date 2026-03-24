export interface OHLCBar {
  high: number;
  low: number;
  close: number;
}

/**
 * Calculate Average True Range (ATR).
 * Uses Wilder's smoothing method (exponential moving average).
 *
 * True Range = max(high - low, |high - prevClose|, |low - prevClose|)
 * ATR = EMA of True Range over `period` bars
 *
 * Returns ATR values aligned to input array (null for insufficient data).
 */
export function calcATR(bars: OHLCBar[], period: number = 14): (number | null)[] {
  if (bars.length === 0) return [];
  if (bars.length < 2) return [null];

  const trueRanges: number[] = [];

  // First bar: TR = high - low (no previous close)
  trueRanges.push(bars[0].high - bars[0].low);

  // Subsequent bars: full TR formula
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevClose = bars[i - 1].close;
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  // Calculate ATR with Wilder's smoothing
  const result: (number | null)[] = [];

  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    if (i === period - 1) {
      // First ATR = simple average of first `period` TRs
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += trueRanges[j];
      }
      result.push(sum / period);
    } else {
      // Wilder's smoothing: ATR = (prevATR * (period-1) + TR) / period
      const prevATR = result[i - 1]!;
      result.push((prevATR * (period - 1) + trueRanges[i]) / period);
    }
  }

  return result;
}

/**
 * Get the latest ATR value for a series of bars.
 * Returns null if insufficient data.
 */
export function latestATR(bars: OHLCBar[], period: number = 14): number | null {
  const atrs = calcATR(bars, period);
  for (let i = atrs.length - 1; i >= 0; i--) {
    if (atrs[i] !== null) return atrs[i];
  }
  return null;
}
