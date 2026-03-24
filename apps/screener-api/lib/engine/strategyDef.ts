/**
 * Strategy Definition Schema
 *
 * A universal format for expressing ANY trading strategy.
 * The user describes it in English. Claude converts it to this format.
 * The backtester executes it mechanically.
 *
 * Design principle: every YouTube strategy, blog post, or trading book
 * can be expressed as a combination of these building blocks.
 */

// ── Entry Conditions ─────────────────────────────────────────

export type Comparator = "above" | "below" | "crosses_above" | "crosses_below" | "between" | "equals";

export interface Condition {
  indicator: IndicatorType;
  params?: Record<string, number>;   // e.g., { period: 14 }
  comparator: Comparator;
  value?: number;                     // e.g., 30 for RSI < 30
  value2?: number;                    // for "between" comparator
  against?: IndicatorType;            // compare indicator vs indicator (e.g., SMA50 crosses_above SMA200)
  againstParams?: Record<string, number>;
}

export type IndicatorType =
  | "price"
  | "sma"           // simple moving average
  | "ema"           // exponential moving average
  | "rsi"
  | "macd_line"
  | "macd_signal"
  | "macd_histogram"
  | "atr"
  | "volume"
  | "volume_sma"    // average volume
  | "trendline_support"   // nearest support trendline
  | "trendline_resistance"
  | "vix"
  | "high"          // bar high
  | "low"           // bar low
  | "close"         // bar close (same as price)
  | "prev_close"    // previous bar's close
  | "day_change_pct";  // (close - prev_close) / prev_close

// ── Strategy Definition ──────────────────────────────────────

export interface StrategyDefinition {
  /** Human-readable name */
  name: string;

  /** Source — where did this idea come from? */
  source: string;  // e.g., "YouTube: The Trading Channel — RSI Divergence Strategy"

  /** One-sentence description a beginner can understand */
  description: string;

  /** The thesis: WHY should this work? */
  thesis: string;

  /** Entry rules: ALL conditions must be true to enter (AND logic) */
  entryConditions: Condition[];

  /** Entry side */
  side: "long" | "short" | "both";

  /** Exit rules: ANY condition triggers exit (OR logic) */
  exitConditions: {
    takeProfit: ExitRule;
    stopLoss: ExitRule;
    trailingStop?: ExitRule;
    timeLimit?: number;      // max days to hold
    customExits?: Condition[];  // additional exit conditions
  };

  /** Position sizing */
  sizing: {
    method: "fixed_pct" | "risk_pct" | "kelly" | "equal_weight";
    value: number;           // e.g., 0.03 for 3% of portfolio
    maxPositions: number;
    maxSectorExposure?: number;  // e.g., 0.30 for 30% max in one sector
  };

  /** Filters — pre-conditions that must be true before even checking entry */
  filters?: {
    regimeFilter?: "bull_only" | "bear_only" | "bull_sideways" | "any";
    minPrice?: number;
    maxPrice?: number;
    minVolume?: number;        // minimum average daily volume
    minMarketCap?: number;
    sectors?: string[];        // only these sectors
    excludeSectors?: string[];
    avoidEarnings?: number;    // skip if earnings within N days
    stockTrendFilter?: {       // per-stock trend requirement
      indicator: "sma" | "ema";
      period: number;
      direction: "above" | "below";  // price must be above/below this MA
    };
  };

  /** Ticker universe — which stocks to scan */
  universe: "sp500" | "all" | "crypto" | string[];  // or custom list
}

export interface ExitRule {
  type: "fixed_pct" | "atr_multiple" | "indicator_cross" | "price_level";
  value: number;
}

// ── Pre-built Strategy Templates ─────────────────────────────

export const STRATEGY_TEMPLATES: Record<string, StrategyDefinition> = {
  // The strategy we've been running
  support_bounce_scalp: {
    name: "Support Bounce Scalp",
    source: "Money OS default",
    description: "Buy stocks near price floors that have held before. Sell at +5% or cut at -2×ATR.",
    thesis: "Prices tend to bounce at levels where buyers historically stepped in. The more times a level has held, the more likely it holds again.",
    entryConditions: [
      { indicator: "price", comparator: "below", against: "trendline_support", againstParams: { atr_distance: 1.0 } },
    ],
    side: "long",
    exitConditions: {
      takeProfit: { type: "fixed_pct", value: 0.05 },
      stopLoss: { type: "atr_multiple", value: 2.0 },
    },
    sizing: { method: "fixed_pct", value: 0.03, maxPositions: 10 },
    universe: "sp500",
  },

  // Classic RSI mean reversion
  rsi_oversold_bounce: {
    name: "RSI Oversold Bounce",
    source: "Classic technical analysis",
    description: "Buy when RSI drops below 30 (oversold), sell when it returns above 50.",
    thesis: "When RSI < 30, selling is exhausted. Like a rubber band stretched too far, a snapback is statistically likely.",
    entryConditions: [
      { indicator: "rsi", params: { period: 14 }, comparator: "below", value: 30 },
    ],
    side: "long",
    exitConditions: {
      takeProfit: { type: "fixed_pct", value: 0.08 },
      stopLoss: { type: "fixed_pct", value: 0.05 },
      customExits: [
        { indicator: "rsi", params: { period: 14 }, comparator: "above", value: 50 },
      ],
    },
    sizing: { method: "fixed_pct", value: 0.03, maxPositions: 10 },
    filters: { regimeFilter: "bull_sideways" },
    universe: "sp500",
  },

  // Golden cross (50 SMA crosses above 200 SMA)
  golden_cross: {
    name: "Golden Cross Trend Follow",
    source: "Classic moving average strategy",
    description: "Buy when the 50-day moving average crosses above the 200-day. Ride the trend. Sell when it crosses back below.",
    thesis: "When fast momentum overtakes slow momentum, a sustained uptrend typically follows. The cross is the starting gun.",
    entryConditions: [
      { indicator: "sma", params: { period: 50 }, comparator: "crosses_above", against: "sma", againstParams: { period: 200 } },
    ],
    side: "long",
    exitConditions: {
      takeProfit: { type: "fixed_pct", value: 0.20 },
      stopLoss: { type: "atr_multiple", value: 3.0 },
      customExits: [
        { indicator: "sma", params: { period: 50 }, comparator: "crosses_below", against: "sma", againstParams: { period: 200 } },
      ],
    },
    sizing: { method: "fixed_pct", value: 0.05, maxPositions: 5 },
    filters: { minVolume: 1_000_000 },
    universe: "sp500",
  },

  // MACD momentum
  macd_momentum: {
    name: "MACD Momentum",
    source: "Gerald Appel — MACD",
    description: "Buy when MACD line crosses above signal line. Momentum is accelerating.",
    thesis: "MACD crossover means short-term momentum is outpacing longer-term momentum. The acceleration often continues for days or weeks.",
    entryConditions: [
      { indicator: "macd_line", comparator: "crosses_above", against: "macd_signal" },
      { indicator: "macd_histogram", comparator: "above", value: 0 },
    ],
    side: "long",
    exitConditions: {
      takeProfit: { type: "fixed_pct", value: 0.10 },
      stopLoss: { type: "atr_multiple", value: 2.0 },
      customExits: [
        { indicator: "macd_line", comparator: "crosses_below", against: "macd_signal" },
      ],
    },
    sizing: { method: "fixed_pct", value: 0.03, maxPositions: 10 },
    filters: { regimeFilter: "bull_sideways" },
    universe: "sp500",
  },

  // Buy the dip with trend confirmation
  buy_the_dip: {
    name: "Buy The Dip (Trend Confirmed)",
    source: "Common YouTube strategy",
    description: "Buy when a stock in an uptrend drops 5%+ in a week. The trend is your friend — dips are discounts.",
    thesis: "In a confirmed uptrend, short-term pullbacks are buying opportunities, not trend changes. The key is confirming the trend is still intact.",
    entryConditions: [
      { indicator: "day_change_pct", comparator: "below", value: -0.05 },  // dropped 5%+ recently
      { indicator: "price", comparator: "above", against: "sma", againstParams: { period: 200 } },  // still above 200 SMA
    ],
    side: "long",
    exitConditions: {
      takeProfit: { type: "fixed_pct", value: 0.10 },
      stopLoss: { type: "fixed_pct", value: 0.07 },
      timeLimit: 30,
    },
    sizing: { method: "fixed_pct", value: 0.04, maxPositions: 8 },
    filters: {
      stockTrendFilter: { indicator: "sma", period: 50, direction: "above" },
      regimeFilter: "bull_sideways",
    },
    universe: "sp500",
  },
};

/**
 * Validate a strategy definition has all required fields.
 */
export function validateStrategy(def: StrategyDefinition): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!def.name) errors.push("name is required");
  if (!def.description) errors.push("description is required");
  if (!def.thesis) errors.push("thesis is required");
  if (!def.entryConditions?.length) errors.push("at least one entry condition required");
  if (!def.exitConditions?.takeProfit) errors.push("take profit exit required");
  if (!def.exitConditions?.stopLoss) errors.push("stop loss exit required");
  if (!def.sizing) errors.push("position sizing required");
  if (def.sizing?.value <= 0 || def.sizing?.value > 1) errors.push("sizing value must be between 0 and 1");

  return { valid: errors.length === 0, errors };
}
