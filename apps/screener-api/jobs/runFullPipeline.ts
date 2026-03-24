/**
 * Run the complete pipeline: fetch bars → compute trendlines → run scanner → generate signals.
 * Can run for a subset of tickers (for testing) or all watched tickers.
 */
import { db, type Database } from "../lib/db";
import {
  bars,
  trendlines,
  scanResults,
  tradingSignals,
  vixData,
  watchedTickers,
  pipelineStatus,
} from "../lib/db/schema";
import { fetchYahooBars } from "../lib/fetchers/yahoo";
import { fetchVix } from "../lib/fetchers/vix";
import { computeTrendlines } from "../lib/engine/trendlineEngine";
import { scanTicker } from "../lib/engine/scannerEngine";
import { generateSignals } from "../lib/engine/signalEngine";
import { latestATR } from "../lib/indicators/atr";
import type { TimedOHLCBar } from "../lib/indicators/zigzag";
import { eq, and, desc, sql as sqlOp } from "drizzle-orm";

const BATCH_SIZE = 10;
const DELAY_MS = 2000;

interface PipelineOptions {
  /** Only process these tickers (for testing). Null = all watched tickers. */
  tickerFilter?: string[];
  /** Skip fetching — use bars already in DB */
  skipFetch?: boolean;
}

export async function runFullPipeline(options: PipelineOptions = {}) {
  if (!db) throw new Error("Database not configured");

  const log = (msg: string) => console.log(`[pipeline] ${msg}`);

  // ── Step 0: Determine ticker universe ───────────────────
  let tickerRows = await db.select().from(watchedTickers);
  if (options.tickerFilter) {
    tickerRows = tickerRows.filter((t) =>
      options.tickerFilter!.includes(t.ticker)
    );
  }
  log(`Universe: ${tickerRows.length} tickers`);

  // ── Step 1: Fetch VIX ───────────────────────────────────
  log("Fetching VIX...");
  try {
    const vix = await fetchVix();
    await db
      .insert(vixData)
      .values({ date: vix.date, close: String(vix.close) })
      .onConflictDoUpdate({ target: vixData.date, set: { close: String(vix.close) } });
    log(`VIX: ${vix.close} (${vix.date})`);
  } catch (e) {
    log(`VIX fetch failed: ${(e as Error).message}, using last known value`);
  }

  // Get latest VIX for scanner
  const latestVixRow = await db
    .select()
    .from(vixData)
    .orderBy(desc(vixData.date))
    .limit(1);
  const currentVix = latestVixRow.length > 0 ? Number(latestVixRow[0].close) : 20;
  log(`Using VIX: ${currentVix}`);

  // ── Step 2: Fetch bars ──────────────────────────────────
  if (!options.skipFetch) {
    log("Fetching daily bars...");
    let fetched = 0;
    let errors = 0;
    for (let i = 0; i < tickerRows.length; i += BATCH_SIZE) {
      const batch = tickerRows.slice(i, i + BATCH_SIZE);
      for (const t of batch) {
        try {
          const dailyBars = await fetchYahooBars(t.ticker, "1d", "6mo");
          const weeklyBars = await fetchYahooBars(t.ticker, "1wk", "2y");

          for (const bar of [...dailyBars.map((b) => ({ ...b, tf: "daily" })), ...weeklyBars.map((b) => ({ ...b, tf: "weekly" }))]) {
            await db
              .insert(bars)
              .values({
                ticker: t.ticker,
                asset: t.asset,
                timeframe: bar.tf,
                ts: new Date(bar.ts),
                open: String(bar.open),
                high: String(bar.high),
                low: String(bar.low),
                close: String(bar.close),
                volume: bar.volume,
              })
              .onConflictDoUpdate({
                target: [bars.ticker, bars.timeframe, bars.ts],
                set: {
                  open: sqlOp`EXCLUDED.open`,
                  high: sqlOp`EXCLUDED.high`,
                  low: sqlOp`EXCLUDED.low`,
                  close: sqlOp`EXCLUDED.close`,
                  volume: sqlOp`EXCLUDED.volume`,
                },
              });
          }
          fetched++;
          if (fetched % 10 === 0) log(`  Fetched ${fetched}/${tickerRows.length}`);
        } catch (e) {
          errors++;
          log(`  Error ${t.ticker}: ${(e as Error).message}`);
        }
      }
      if (i + BATCH_SIZE < tickerRows.length) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }
    log(`Bars fetched: ${fetched} ok, ${errors} errors`);
  }

  // ── Step 3: Compute trendlines ──────────────────────────
  log("Computing trendlines...");
  let trendlineCount = 0;

  // Clear old bot trendlines for tickers we're processing
  for (const t of tickerRows) {
    await db.delete(trendlines).where(eq(trendlines.ticker, t.ticker));
  }

  for (const t of tickerRows) {
    for (const tf of ["daily", "weekly"] as const) {
      const barRows = await db
        .select()
        .from(bars)
        .where(and(eq(bars.ticker, t.ticker), eq(bars.timeframe, tf)))
        .orderBy(bars.ts);

      if (barRows.length < 20) continue;

      const timedBars: TimedOHLCBar[] = barRows.map((b) => ({
        high: Number(b.high),
        low: Number(b.low),
        close: Number(b.close),
        ts: b.ts.toISOString(),
      }));

      const tls = computeTrendlines(t.ticker, tf, timedBars);

      for (const tl of tls) {
        await db.insert(trendlines).values({
          ticker: tl.ticker,
          timeframe: tl.timeframe,
          type: tl.type,
          x1Ts: new Date(tl.x1Ts),
          x2Ts: new Date(tl.x2Ts),
          y1: String(tl.y1),
          y2: String(tl.y2),
          slope: String(tl.slope),
          touches: tl.touches,
          score: String(tl.score),
          active: true,
        });
        trendlineCount++;
      }
    }
  }
  log(`Trendlines computed: ${trendlineCount}`);

  // ── Step 4: Run scanner ─────────────────────────────────
  log("Running scanner...");
  await db.delete(scanResults); // Clear old results

  let scanCount = 0;
  for (const t of tickerRows) {
    // Get latest price
    const latestBar = await db
      .select()
      .from(bars)
      .where(and(eq(bars.ticker, t.ticker), eq(bars.timeframe, "daily")))
      .orderBy(desc(bars.ts))
      .limit(1);

    if (latestBar.length === 0) continue;
    const currentPrice = Number(latestBar[0].close);

    // Get ATR
    const recentBars = await db
      .select()
      .from(bars)
      .where(and(eq(bars.ticker, t.ticker), eq(bars.timeframe, "daily")))
      .orderBy(desc(bars.ts))
      .limit(20);

    const atr = latestATR(
      recentBars.reverse().map((b) => ({
        high: Number(b.high),
        low: Number(b.low),
        close: Number(b.close),
      }))
    );
    if (!atr) continue;

    // Get active trendlines
    const activeTls = await db
      .select()
      .from(trendlines)
      .where(and(eq(trendlines.ticker, t.ticker), eq(trendlines.active, true)));

    const tlCandidates = activeTls.map((tl) => ({
      ticker: tl.ticker,
      timeframe: tl.timeframe,
      type: tl.type as "support" | "resistance",
      x1Ts: tl.x1Ts.toISOString(),
      x2Ts: tl.x2Ts.toISOString(),
      y1: Number(tl.y1),
      y2: Number(tl.y2),
      slope: Number(tl.slope),
      touches: tl.touches ?? 2,
      score: Number(tl.score),
    }));

    const results = scanTicker(
      t.ticker, t.asset, currentPrice, atr, currentVix,
      tlCandidates, t.sector
    );

    for (const r of results) {
      await db.insert(scanResults).values({
        ticker: r.ticker,
        asset: r.asset,
        price: String(r.price),
        signalType: r.signalType,
        level: String(r.level),
        distanceAtr: String(r.distanceAtr),
        distanceUsd: String(r.distanceUsd),
        zone: r.zone,
        timeframe: r.timeframe,
        direction: r.direction,
        sector: r.sector,
      });
      scanCount++;
    }
  }
  log(`Scan results: ${scanCount}`);

  // ── Step 5: Generate signals ────────────────────────────
  log("Generating signals...");
  const today = new Date().toISOString().slice(0, 10);

  // Clear today's signals
  await db.delete(tradingSignals).where(eq(tradingSignals.signalDate, today));

  let signalCount = 0;
  for (const t of tickerRows) {
    const barRows = await db
      .select()
      .from(bars)
      .where(and(eq(bars.ticker, t.ticker), eq(bars.timeframe, "daily")))
      .orderBy(bars.ts);

    if (barRows.length < 30) continue;

    const engineBars = barRows.map((b) => ({
      high: Number(b.high),
      low: Number(b.low),
      close: Number(b.close),
      ts: b.ts.toISOString(),
    }));

    const activeTls = await db
      .select()
      .from(trendlines)
      .where(and(eq(trendlines.ticker, t.ticker), eq(trendlines.active, true)));

    const tlCandidates = activeTls.map((tl) => ({
      ticker: tl.ticker,
      timeframe: tl.timeframe,
      type: tl.type as "support" | "resistance",
      x1Ts: tl.x1Ts.toISOString(),
      x2Ts: tl.x2Ts.toISOString(),
      y1: Number(tl.y1),
      y2: Number(tl.y2),
      slope: Number(tl.slope),
      touches: tl.touches ?? 2,
      score: Number(tl.score),
    }));

    const signals = generateSignals(t.ticker, "daily", engineBars, tlCandidates);

    for (const sig of signals) {
      await db.insert(tradingSignals).values({
        ticker: sig.ticker,
        timeframe: sig.timeframe,
        signalType: sig.signalType,
        direction: sig.direction,
        detail: sig.detail,
        entryPrice: sig.entryPrice ? String(sig.entryPrice) : null,
        stopPrice: sig.stopPrice ? String(sig.stopPrice) : null,
        signalDate: sig.signalDate,
      });
      signalCount++;
    }
  }
  log(`Signals generated: ${signalCount}`);

  log("Pipeline complete!");
  return { trendlineCount, scanCount, signalCount };
}
