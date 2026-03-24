import { computeTrendlines, projectTrendline, type TrendlineCandidate } from "./trendlineEngine";
import { scanTicker } from "./scannerEngine";
import { generateSignals } from "./signalEngine";
import { latestATR, calcATR } from "../indicators/atr";
import { detectRegime, regimePositionMultiplier } from "../indicators/regime";
import type { TimedOHLCBar } from "../indicators/zigzag";

// ── Types ────────────────────────────────────────────────────

export interface BacktestConfig {
  initialCapital: number;
  maxPositionPct: number;      // max % of portfolio per position (e.g., 0.05 = 5%)
  maxPositions: number;        // max concurrent positions
  stopLossAtrMultiple: number; // stop loss at N × ATR below entry
  takeProfitPct: number;       // take profit at N% gain
  vix: number;                 // fixed VIX for backtesting (or array per day)
  entryConfirmation: number;   // min number of confirming signals to enter
  useRegimeFilter: boolean;    // gate entries by market regime (SPY-based)
  useStockTrendFilter: boolean;  // only buy if stock is above its own 50 SMA
  useMultiTfScoring: boolean;    // boost position size when weekly+daily trendlines align
}

export interface Trade {
  ticker: string;
  direction: "long";
  entryDate: string;
  entryPrice: number;
  exitDate: string | null;
  exitPrice: number | null;
  exitReason: "take_profit" | "stop_loss" | "end_of_data" | null;
  shares: number;
  pnl: number;
  pnlPct: number;
  holdingDays: number;
  signals: string[];
}

export interface BacktestResult {
  config: BacktestConfig;
  ticker: string;
  timeframe: string;
  barCount: number;
  trades: Trade[];
  // Summary stats
  totalTrades: number;
  winners: number;
  losers: number;
  winRate: number;
  avgWinPct: number;
  avgLossPct: number;
  totalPnl: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  avgHoldingDays: number;
  profitFactor: number;     // gross profits / gross losses
  sharpeRatio: number;
}

export interface PortfolioBacktestResult {
  config: BacktestConfig;
  tickers: string[];
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturnPct: number;
  totalTrades: number;
  winRate: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  profitFactor: number;
  trades: Trade[];
  equityCurve: Array<{ date: string; equity: number }>;
}

const DEFAULT_CONFIG: BacktestConfig = {
  initialCapital: 100_000,
  maxPositionPct: 0.03,       // 3% per position
  maxPositions: 10,
  stopLossAtrMultiple: 1.5,
  takeProfitPct: 0.10,        // 10% take profit
  vix: 20,
  entryConfirmation: 1,       // at least 1 confirming signal
  useRegimeFilter: true,      // enabled by default
  useStockTrendFilter: false, // off by default (new)
  useMultiTfScoring: false,   // off by default (new)
};

// ── Single Ticker Backtest ───────────────────────────────────

/**
 * Backtest the screener's signals on a single ticker's historical data.
 *
 * Walks through bars day by day:
 * - At each bar, computes trendlines using data up to that point
 * - Runs scanner to check if price is in ENTRY zone
 * - Runs signal generator for confirmation
 * - If ENTRY + enough signals → enter long
 * - Exit on take-profit, stop-loss, or end of data
 */
export function backtestTicker(
  ticker: string,
  dailyBars: TimedOHLCBar[],
  weeklyBars: TimedOHLCBar[],
  config: Partial<BacktestConfig> = {},
  benchmarkCloses?: number[] // SPY daily closes for regime detection
): BacktestResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (dailyBars.length < 60) {
    return emptyResult(ticker, "daily", dailyBars.length, cfg);
  }

  const trades: Trade[] = [];
  let activePosition: {
    entryDate: string;
    entryPrice: number;
    shares: number;
    stopLoss: number;
    takeProfit: number;
    signals: string[];
  } | null = null;

  // We need at least 40 bars of lookback before we start trading
  const lookbackPeriod = 40;
  let cachedTrendlines: TrendlineCandidate[] = [];

  for (let i = lookbackPeriod; i < dailyBars.length; i++) {
    const today = dailyBars[i];
    const todayPrice = today.close;
    const todayDate = today.ts.slice(0, 10);

    // Check exit conditions for active position
    if (activePosition) {
      // Stop loss
      if (today.low <= activePosition.stopLoss) {
        const exitPrice = activePosition.stopLoss;
        const pnl = (exitPrice - activePosition.entryPrice) * activePosition.shares;
        const pnlPct = (exitPrice - activePosition.entryPrice) / activePosition.entryPrice;
        const holdingDays = Math.round(
          (new Date(todayDate).getTime() - new Date(activePosition.entryDate).getTime()) / 86400000
        );
        trades.push({
          ticker,
          direction: "long",
          entryDate: activePosition.entryDate,
          entryPrice: activePosition.entryPrice,
          exitDate: todayDate,
          exitPrice,
          exitReason: "stop_loss",
          shares: activePosition.shares,
          pnl,
          pnlPct,
          holdingDays,
          signals: activePosition.signals,
        });
        activePosition = null;
        continue;
      }

      // Take profit
      if (today.high >= activePosition.takeProfit) {
        const exitPrice = activePosition.takeProfit;
        const pnl = (exitPrice - activePosition.entryPrice) * activePosition.shares;
        const pnlPct = (exitPrice - activePosition.entryPrice) / activePosition.entryPrice;
        const holdingDays = Math.round(
          (new Date(todayDate).getTime() - new Date(activePosition.entryDate).getTime()) / 86400000
        );
        trades.push({
          ticker,
          direction: "long",
          entryDate: activePosition.entryDate,
          entryPrice: activePosition.entryPrice,
          exitDate: todayDate,
          exitPrice,
          exitReason: "take_profit",
          shares: activePosition.shares,
          pnl,
          pnlPct,
          holdingDays,
          signals: activePosition.signals,
        });
        activePosition = null;
        continue;
      }

      continue; // Already in a position, skip entry logic
    }

    // ── Entry Logic ──────────────────────────────────────

    // Regime filter: check market regime before entering
    if (cfg.useRegimeFilter && benchmarkCloses && benchmarkCloses.length > 50) {
      // Use benchmark closes up to the current bar index
      const benchmarkSlice = benchmarkCloses.slice(0, Math.min(i + 1, benchmarkCloses.length));
      if (benchmarkSlice.length >= 50) {
        const regime = detectRegime(benchmarkSlice);
        const multiplier = regimePositionMultiplier(regime.regime);
        if (multiplier === 0) continue; // Skip entry in bear market
      }
    }

    // Compute trendlines using bars up to today
    const lookbackBars = dailyBars.slice(0, i + 1);
    const weeklyLookback = weeklyBars.filter(
      (b) => new Date(b.ts) <= new Date(today.ts)
    );

    // Only recompute trendlines every 5 days (performance)
    // NOTE: cachedTrendlines is hoisted above the loop — persists between iterations
    if (i % 5 === 0 || i === lookbackPeriod) {
      const dailyTLs = computeTrendlines(ticker, "daily", lookbackBars, 5);
      const weeklyTLs = weeklyLookback.length >= 20
        ? computeTrendlines(ticker, "weekly", weeklyLookback, 5)
        : [];
      cachedTrendlines = [...dailyTLs, ...weeklyTLs];
    }

    if (cachedTrendlines.length === 0) continue;

    // Compute ATR
    const atr = latestATR(lookbackBars.slice(-20));
    if (!atr || atr === 0) continue;

    // ── Stock-level trend filter: only buy if stock is above its 50 SMA ──
    if (cfg.useStockTrendFilter && lookbackBars.length >= 50) {
      const last50Closes = lookbackBars.slice(-50).map((b) => b.close);
      const sma50 = last50Closes.reduce((s, v) => s + v, 0) / 50;
      if (todayPrice < sma50) continue; // stock in downtrend — skip
    }

    // Run scanner
    const scanResults = scanTicker(
      ticker, "stock", todayPrice, atr, cfg.vix,
      cachedTrendlines, null, new Date(today.ts)
    );

    const entryResults = scanResults.filter((r) => r.zone === "ENTRY");
    if (entryResults.length === 0) continue;

    // Run signal generator for confirmation
    const engineBars = lookbackBars.map((b) => ({
      high: b.high,
      low: b.low,
      close: b.close,
      ts: b.ts,
    }));
    const signals = generateSignals(ticker, "daily", engineBars, cachedTrendlines);
    const bullishSignals = signals.filter((s) => s.direction === "bull");

    if (bullishSignals.length < cfg.entryConfirmation) continue;

    // ── Execute Entry ────────────────────────────────────
    // Adjust position size by regime (full in bull, half in sideways)
    let regimeMultiplier = 1.0;
    if (cfg.useRegimeFilter && benchmarkCloses) {
      const benchSlice = benchmarkCloses.slice(0, Math.min(i + 1, benchmarkCloses.length));
      if (benchSlice.length >= 50) {
        regimeMultiplier = regimePositionMultiplier(detectRegime(benchSlice).regime);
      }
    }

    // Multi-timeframe confluence: boost size when weekly + daily trendlines both show support
    let confluenceMultiplier = 1.0;
    if (cfg.useMultiTfScoring) {
      const weeklySupport = entryResults.some((r) => r.timeframe === "weekly" && r.direction === "support");
      const dailySupport = entryResults.some((r) => r.timeframe === "daily" && r.direction === "support");
      if (weeklySupport && dailySupport) {
        confluenceMultiplier = 1.5; // 50% larger position when both timeframes align
      }
    }

    const positionSize = cfg.initialCapital * cfg.maxPositionPct * regimeMultiplier * confluenceMultiplier;
    const shares = Math.floor(positionSize / todayPrice);
    if (shares === 0) continue;

    const stopLoss = todayPrice - cfg.stopLossAtrMultiple * atr;
    const takeProfit = todayPrice * (1 + cfg.takeProfitPct);

    activePosition = {
      entryDate: todayDate,
      entryPrice: todayPrice,
      shares,
      stopLoss,
      takeProfit,
      signals: bullishSignals.map((s) => s.signalType),
    };
  }

  // Close any open position at end of data
  if (activePosition) {
    const lastBar = dailyBars[dailyBars.length - 1];
    const exitPrice = lastBar.close;
    const pnl = (exitPrice - activePosition.entryPrice) * activePosition.shares;
    const pnlPct = (exitPrice - activePosition.entryPrice) / activePosition.entryPrice;
    const holdingDays = Math.round(
      (new Date(lastBar.ts).getTime() - new Date(activePosition.entryDate).getTime()) / 86400000
    );
    trades.push({
      ticker,
      direction: "long",
      entryDate: activePosition.entryDate,
      entryPrice: activePosition.entryPrice,
      exitDate: lastBar.ts.slice(0, 10),
      exitPrice,
      exitReason: "end_of_data",
      shares: activePosition.shares,
      pnl,
      pnlPct,
      holdingDays,
      signals: activePosition.signals,
    });
  }

  return computeStats(ticker, "daily", dailyBars.length, trades, cfg);
}

// ── Portfolio-Level Backtest ─────────────────────────────────

/**
 * Backtest across multiple tickers with a shared capital pool.
 */
export function backtestPortfolio(
  tickerData: Array<{
    ticker: string;
    dailyBars: TimedOHLCBar[];
    weeklyBars: TimedOHLCBar[];
    sector?: string;
  }>,
  config: Partial<BacktestConfig> = {},
  benchmarkCloses?: number[] // SPY daily closes for regime detection
): PortfolioBacktestResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Run individual backtests
  const allTrades: Trade[] = [];
  for (const { ticker, dailyBars, weeklyBars } of tickerData) {
    const result = backtestTicker(ticker, dailyBars, weeklyBars, cfg, benchmarkCloses);
    allTrades.push(...result.trades);
  }

  // Sort all trades by entry date
  allTrades.sort((a, b) => a.entryDate.localeCompare(b.entryDate));

  // Simulate portfolio equity curve
  let capital = cfg.initialCapital;
  let peakCapital = capital;
  let maxDrawdown = 0;
  const equityCurve: Array<{ date: string; equity: number }> = [];
  const dailyReturns: number[] = [];

  let prevCapital = capital;
  for (const trade of allTrades) {
    capital += trade.pnl;
    if (capital > peakCapital) peakCapital = capital;
    const drawdown = (peakCapital - capital) / peakCapital;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    equityCurve.push({ date: trade.exitDate ?? trade.entryDate, equity: capital });
    dailyReturns.push((capital - prevCapital) / prevCapital);
    prevCapital = capital;
  }

  const winners = allTrades.filter((t) => t.pnl > 0);
  const losers = allTrades.filter((t) => t.pnl <= 0);
  const grossProfit = winners.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losers.reduce((s, t) => s + t.pnl, 0));

  // Sharpe ratio (annualized, assuming ~252 trading days)
  const avgReturn = dailyReturns.length > 0
    ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length
    : 0;
  const stdReturn = dailyReturns.length > 1
    ? Math.sqrt(dailyReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (dailyReturns.length - 1))
    : 1;
  const sharpe = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

  const firstDate = allTrades.length > 0 ? allTrades[0].entryDate : "";
  const lastDate = allTrades.length > 0
    ? (allTrades[allTrades.length - 1].exitDate ?? allTrades[allTrades.length - 1].entryDate)
    : "";

  return {
    config: cfg,
    tickers: tickerData.map((t) => t.ticker),
    startDate: firstDate,
    endDate: lastDate,
    initialCapital: cfg.initialCapital,
    finalCapital: Number(capital.toFixed(2)),
    totalReturnPct: Number((((capital - cfg.initialCapital) / cfg.initialCapital) * 100).toFixed(2)),
    totalTrades: allTrades.length,
    winRate: allTrades.length > 0 ? Number(((winners.length / allTrades.length) * 100).toFixed(1)) : 0,
    maxDrawdownPct: Number((maxDrawdown * 100).toFixed(2)),
    sharpeRatio: Number(sharpe.toFixed(2)),
    profitFactor: grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? Infinity : 0,
    trades: allTrades,
    equityCurve,
  };
}

// ── Helpers ──────────────────────────────────────────────────

function emptyResult(
  ticker: string,
  timeframe: string,
  barCount: number,
  cfg: BacktestConfig
): BacktestResult {
  return {
    config: cfg,
    ticker,
    timeframe,
    barCount,
    trades: [],
    totalTrades: 0,
    winners: 0,
    losers: 0,
    winRate: 0,
    avgWinPct: 0,
    avgLossPct: 0,
    totalPnl: 0,
    totalReturnPct: 0,
    maxDrawdownPct: 0,
    avgHoldingDays: 0,
    profitFactor: 0,
    sharpeRatio: 0,
  };
}

function computeStats(
  ticker: string,
  timeframe: string,
  barCount: number,
  trades: Trade[],
  cfg: BacktestConfig
): BacktestResult {
  const winners = trades.filter((t) => t.pnl > 0);
  const losers = trades.filter((t) => t.pnl <= 0);

  const avgWinPct =
    winners.length > 0
      ? winners.reduce((s, t) => s + t.pnlPct, 0) / winners.length
      : 0;
  const avgLossPct =
    losers.length > 0
      ? losers.reduce((s, t) => s + t.pnlPct, 0) / losers.length
      : 0;

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const grossProfit = winners.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losers.reduce((s, t) => s + t.pnl, 0));

  // Max drawdown
  let equity = cfg.initialCapital;
  let peak = equity;
  let maxDrawdown = 0;
  const returns: number[] = [];
  let prevEquity = equity;

  for (const trade of trades) {
    equity += trade.pnl;
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
    returns.push((equity - prevEquity) / prevEquity);
    prevEquity = equity;
  }

  const avgReturn = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
  const stdReturn = returns.length > 1
    ? Math.sqrt(returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (returns.length - 1))
    : 1;
  const sharpe = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(trades.length) : 0;

  const avgHoldingDays =
    trades.length > 0
      ? trades.reduce((s, t) => s + t.holdingDays, 0) / trades.length
      : 0;

  return {
    config: cfg,
    ticker,
    timeframe,
    barCount,
    trades,
    totalTrades: trades.length,
    winners: winners.length,
    losers: losers.length,
    winRate: trades.length > 0 ? Number(((winners.length / trades.length) * 100).toFixed(1)) : 0,
    avgWinPct: Number((avgWinPct * 100).toFixed(2)),
    avgLossPct: Number((avgLossPct * 100).toFixed(2)),
    totalPnl: Number(totalPnl.toFixed(2)),
    totalReturnPct: Number(((totalPnl / cfg.initialCapital) * 100).toFixed(2)),
    maxDrawdownPct: Number((maxDrawdown * 100).toFixed(2)),
    avgHoldingDays: Number(avgHoldingDays.toFixed(1)),
    profitFactor: grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? Infinity : 0,
    sharpeRatio: Number(sharpe.toFixed(2)),
  };
}
