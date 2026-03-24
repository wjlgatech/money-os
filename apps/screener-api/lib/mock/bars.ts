export interface MockBar {
  ts: string; // ISO timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Simple seeded pseudo-random number generator.
 * Deterministic: same seed always produces same sequence.
 */
function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return hash;
}

// Base prices for mock tickers — roughly realistic
const BASE_PRICES: Record<string, number> = {
  AAPL: 185,
  MSFT: 415,
  QCOM: 170,
  UNH: 520,
  NVDA: 880,
};

/**
 * Generate deterministic OHLCV bars for a ticker.
 * Same ticker + timeframe + days always returns the same data.
 */
export function getMockBars(
  ticker: string,
  timeframe: "daily" | "weekly" = "daily",
  days: number = 90
): MockBar[] {
  const seed = hashString(`${ticker}-${timeframe}`);
  const rng = createRng(seed);
  const basePrice = BASE_PRICES[ticker] ?? 100;

  const bars: MockBar[] = [];
  let price = basePrice;
  const now = new Date();
  const msPerDay = 86400000;
  const step = timeframe === "weekly" ? 7 : 1;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * step * msPerDay);

    // Skip weekends for stocks
    const dow = date.getDay();
    if (timeframe === "daily" && (dow === 0 || dow === 6)) continue;

    // Random walk: ±2% daily, ±5% weekly
    const maxMove = timeframe === "weekly" ? 0.05 : 0.02;
    const change = (rng() - 0.48) * maxMove; // slight upward bias
    price = price * (1 + change);

    // Generate OHLCV
    const volatility = price * 0.015;
    const open = price + (rng() - 0.5) * volatility;
    const close = price;
    const high = Math.max(open, close) + rng() * volatility;
    const low = Math.min(open, close) - rng() * volatility;
    const volume = Math.floor(1_000_000 + rng() * 50_000_000);

    bars.push({
      ts: date.toISOString(),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });
  }

  return bars;
}

/**
 * Pre-built mock scan results for dev mode.
 */
export function getMockScannerResults() {
  return [
    {
      ticker: "QCOM",
      asset: "stock",
      price: 187.42,
      signalType: "TL",
      level: 185.5,
      distanceAtr: 0.3,
      distanceUsd: 1.92,
      zone: "ENTRY",
      timeframe: "weekly",
      direction: "support",
      sector: "Semiconductors",
      earningsDate: null,
      scannedAt: new Date().toISOString(),
    },
    {
      ticker: "UNH",
      asset: "stock",
      price: 521.08,
      signalType: "IX",
      level: 518.0,
      distanceAtr: 0.1,
      distanceUsd: 3.08,
      zone: "ENTRY",
      timeframe: "daily",
      direction: "support",
      sector: "Healthcare",
      earningsDate: null,
      scannedAt: new Date().toISOString(),
    },
    {
      ticker: "AAPL",
      asset: "stock",
      price: 186.2,
      signalType: "TL",
      level: 191.0,
      distanceAtr: 0.8,
      distanceUsd: 4.8,
      zone: "ALERT",
      timeframe: "daily",
      direction: "resistance",
      sector: "Technology",
      earningsDate: null,
      scannedAt: new Date().toISOString(),
    },
  ];
}

/**
 * Pre-built mock signals for dev mode.
 */
export function getMockSignals() {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      ticker: "QCOM",
      timeframe: "daily",
      signalType: "rsi_oversold",
      direction: "bull",
      detail: "RSI(14) = 28.4 — oversold on daily",
      entryPrice: 187.42,
      stopPrice: 180.0,
      signalDate: today,
    },
    {
      ticker: "NVDA",
      timeframe: "weekly",
      signalType: "divergence",
      direction: "bear",
      detail: "Bearish divergence: price higher high, RSI lower high",
      entryPrice: null,
      stopPrice: null,
      signalDate: today,
    },
    {
      ticker: "MSFT",
      timeframe: "daily",
      signalType: "macd_crossover",
      direction: "bull",
      detail: "MACD line crossed above signal line",
      entryPrice: 415.3,
      stopPrice: 405.0,
      signalDate: today,
    },
  ];
}
