export interface MACDResult {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    if (i === period - 1) {
      // First EMA = SMA of first `period` values
      let sum = 0;
      for (let j = 0; j <= i; j++) sum += data[j];
      result.push(sum / period);
    } else {
      const prev = result[i - 1]!;
      result.push((data[i] - prev) * multiplier + prev);
    }
  }

  return result;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence).
 *
 * MACD Line = EMA(fast) - EMA(slow)
 * Signal Line = EMA(MACD Line, signal period)
 * Histogram = MACD - Signal
 *
 * Default: MACD(12, 26, 9)
 */
export function calcMACD(
  closes: number[],
  fast: number = 12,
  slow: number = 26,
  signalPeriod: number = 9
): MACDResult[] {
  if (closes.length < slow) {
    return closes.map(() => ({ macd: null, signal: null, histogram: null }));
  }

  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);

  // MACD line = fast EMA - slow EMA
  const macdLine: number[] = [];
  const results: MACDResult[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (fastEma[i] === null || slowEma[i] === null) {
      macdLine.push(0); // placeholder
      results.push({ macd: null, signal: null, histogram: null });
    } else {
      const macdVal = fastEma[i]! - slowEma[i]!;
      macdLine.push(macdVal);
      results.push({ macd: macdVal, signal: null, histogram: null });
    }
  }

  // Signal line = EMA of MACD values (only from where MACD starts being valid)
  const validMacdStart = slow - 1;
  const validMacdValues = macdLine.slice(validMacdStart);
  const signalEma = ema(validMacdValues, signalPeriod);

  for (let i = 0; i < signalEma.length; i++) {
    const resultIdx = i + validMacdStart;
    if (signalEma[i] !== null && results[resultIdx].macd !== null) {
      results[resultIdx].signal = signalEma[i];
      results[resultIdx].histogram = results[resultIdx].macd! - signalEma[i]!;
    }
  }

  return results;
}

/**
 * Detect MACD crossovers in the last N bars.
 * Returns the most recent crossover, or null.
 */
export function detectMACDCrossover(
  macdResults: MACDResult[],
  lookback: number = 3
): { direction: "bull" | "bear"; barsAgo: number } | null {
  for (let i = macdResults.length - 1; i >= Math.max(1, macdResults.length - lookback); i--) {
    const curr = macdResults[i];
    const prev = macdResults[i - 1];

    if (
      curr.macd === null || curr.signal === null ||
      prev.macd === null || prev.signal === null
    ) continue;

    const currAbove = curr.macd > curr.signal;
    const prevAbove = prev.macd > prev.signal;

    if (currAbove && !prevAbove) {
      return { direction: "bull", barsAgo: macdResults.length - 1 - i };
    }
    if (!currAbove && prevAbove) {
      return { direction: "bear", barsAgo: macdResults.length - 1 - i };
    }
  }

  return null;
}
