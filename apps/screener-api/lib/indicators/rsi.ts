/**
 * Calculate Relative Strength Index (RSI) using Wilder's smoothing.
 *
 * RSI = 100 - 100 / (1 + RS)
 * RS = Average Gain / Average Loss (Wilder's exponential smoothing)
 *
 * Returns RSI values aligned to input array (null for insufficient data).
 */
export function calcRSI(closes: number[], period: number = 14): (number | null)[] {
  if (closes.length < 2) return closes.map(() => null);

  const result: (number | null)[] = [null]; // First bar has no RSI

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // Need at least `period` changes
  if (changes.length < period) {
    return closes.map(() => null);
  }

  // First average: simple mean of first `period` gains and losses
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  // Fill nulls for pre-period bars
  for (let i = 1; i < period; i++) {
    result.push(null);
  }

  // First RSI
  const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + firstRS));

  // Subsequent RSI: Wilder's smoothing
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }

  return result;
}

/**
 * Get the latest RSI value.
 */
export function latestRSI(closes: number[], period: number = 14): number | null {
  const rsis = calcRSI(closes, period);
  for (let i = rsis.length - 1; i >= 0; i--) {
    if (rsis[i] !== null) return rsis[i];
  }
  return null;
}
