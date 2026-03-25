import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { config } from "@/lib/config";
import { getMockBars } from "@/lib/mock/bars";
import { fetchYahooBars } from "@/lib/fetchers/yahoo";
import { computeTrendlines } from "@/lib/engine/trendlineEngine";
import type { TimedOHLCBar } from "@/lib/indicators/zigzag";

export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");

  if (!ticker) return apiError("ticker parameter is required", 400);

  if (!config.hasDatabaseUrl) {
    // No DB — compute from Yahoo Finance, fall back to mock
    try {
      const rawDaily = await fetchYahooBars(ticker.toUpperCase(), "1d", "6mo");
      const rawWeekly = await fetchYahooBars(ticker.toUpperCase(), "1wk", "2y");
      const toTimedBars = (bars: typeof rawDaily): TimedOHLCBar[] =>
        bars.map((b) => ({ high: b.high, low: b.low, close: b.close, ts: b.ts }));
      const daily = computeTrendlines(ticker, "daily", toTimedBars(rawDaily));
      const weekly = computeTrendlines(ticker, "weekly", toTimedBars(rawWeekly));
      return apiSuccess({ ticker, trendlines: [...daily, ...weekly], source: "computed" });
    } catch {
      const dailyBars = getMockBars(ticker, "daily", 90).map(
        (b): TimedOHLCBar => ({ high: b.high, low: b.low, close: b.close, ts: b.ts })
      );
      const weeklyBars = getMockBars(ticker, "weekly", 90).map(
        (b): TimedOHLCBar => ({ high: b.high, low: b.low, close: b.close, ts: b.ts })
      );
      const daily = computeTrendlines(ticker, "daily", dailyBars);
      const weekly = computeTrendlines(ticker, "weekly", weeklyBars);
      return apiSuccess({ ticker, trendlines: [...daily, ...weekly], source: "mock" });
    }
  }

  // ── DB configured: try DB first, fall back to computed ───────
  try {
    const { db } = await import("@/lib/db");
    const { trendlines } = await import("@/lib/db/schema");
    const { eq, and } = await import("drizzle-orm");

    if (!db) throw new Error("db unavailable");

    const query = db
      .select()
      .from(trendlines)
      .where(and(eq(trendlines.ticker, ticker.toUpperCase()), eq(trendlines.active, true)));

    const results = await Promise.race([
      query,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), 5000)
      ),
    ]);

    return apiSuccess({ ticker, trendlines: results });
  } catch {
    // DB timeout or error — compute from Yahoo Finance bars
  }

  // ── Fallback: compute trendlines from Yahoo Finance ───────────
  try {
    const rawDaily = await fetchYahooBars(ticker.toUpperCase(), "1d", "6mo");
    const rawWeekly = await fetchYahooBars(ticker.toUpperCase(), "1wk", "2y");

    const toTimedBars = (bars: typeof rawDaily): TimedOHLCBar[] =>
      bars.map((b) => ({ high: b.high, low: b.low, close: b.close, ts: b.ts }));

    const daily = computeTrendlines(ticker, "daily", toTimedBars(rawDaily));
    const weekly = computeTrendlines(ticker, "weekly", toTimedBars(rawWeekly));

    return apiSuccess({ ticker, trendlines: [...daily, ...weekly], source: "computed" });
  } catch {
    // Last resort: mock bars
    const dailyBars = getMockBars(ticker, "daily", 90).map(
      (b): TimedOHLCBar => ({ high: b.high, low: b.low, close: b.close, ts: b.ts })
    );
    const weeklyBars = getMockBars(ticker, "weekly", 90).map(
      (b): TimedOHLCBar => ({ high: b.high, low: b.low, close: b.close, ts: b.ts })
    );
    const daily = computeTrendlines(ticker, "daily", dailyBars);
    const weekly = computeTrendlines(ticker, "weekly", weeklyBars);
    return apiSuccess({ ticker, trendlines: [...daily, ...weekly], source: "mock" });
  }
}
