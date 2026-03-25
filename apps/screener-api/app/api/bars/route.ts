import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { config } from "@/lib/config";
import { getMockBars } from "@/lib/mock/bars";
import { fetchYahooBars } from "@/lib/fetchers/yahoo";

export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");
  const timeframe = searchParams.get("timeframe") ?? "daily";
  const limit = parseInt(searchParams.get("limit") ?? "90", 10);

  if (!ticker) return apiError("ticker parameter is required", 400);
  if (!["daily", "weekly"].includes(timeframe)) {
    return apiError("timeframe must be daily or weekly", 400);
  }

  const yahooInterval = timeframe === "weekly" ? "1wk" : "1d";
  const yahooRange = limit <= 90 ? "6mo" : limit <= 180 ? "1y" : "2y";

  // ── No DB configured: Yahoo Finance directly ──────────────
  if (!config.hasDatabaseUrl) {
    try {
      const bars = await fetchYahooBars(ticker.toUpperCase(), yahooInterval, yahooRange);
      return apiSuccess({ ticker, timeframe, bars: bars.slice(-limit), total: bars.length, source: "yahoo" });
    } catch {
      // Last resort: deterministic mock
      const bars = getMockBars(ticker, timeframe as "daily" | "weekly", limit);
      return apiSuccess({ ticker, timeframe, bars, total: bars.length, source: "mock" });
    }
  }

  // ── DB configured: try DB first, fall back to Yahoo ───────
  try {
    const { db } = await import("@/lib/db");
    const { bars } = await import("@/lib/db/schema");
    const { eq, and, desc } = await import("drizzle-orm");

    if (!db) throw new Error("db unavailable");

    const query = db.select().from(bars)
      .where(and(eq(bars.ticker, ticker.toUpperCase()), eq(bars.timeframe, timeframe)))
      .orderBy(desc(bars.ts))
      .limit(limit);

    const results = await Promise.race([
      query,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), 5000)
      ),
    ]);

    if (results.length > 0) {
      return apiSuccess({ ticker, timeframe, bars: results, total: results.length, source: "db" });
    }
    // DB has no data for this ticker — fall through to Yahoo
  } catch {
    // DB timeout or error — fall through to Yahoo
  }

  // ── Yahoo Finance fallback ─────────────────────────────────
  try {
    const bars = await fetchYahooBars(ticker.toUpperCase(), yahooInterval, yahooRange);
    return apiSuccess({ ticker, timeframe, bars: bars.slice(-limit), total: bars.length, source: "yahoo" });
  } catch {
    const bars = getMockBars(ticker, timeframe as "daily" | "weekly", limit);
    return apiSuccess({ ticker, timeframe, bars, total: bars.length, source: "mock" });
  }
}
