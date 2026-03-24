import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { config } from "@/lib/config";
import { getMockBars } from "@/lib/mock/bars";
import { computeTrendlines } from "@/lib/engine/trendlineEngine";
import type { TimedOHLCBar } from "@/lib/indicators/zigzag";

export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");

  if (!ticker) return apiError("ticker parameter is required", 400);

  if (!config.hasDatabaseUrl) {
    // Compute trendlines from mock data on the fly
    const dailyBars = getMockBars(ticker, "daily", 90).map(
      (b): TimedOHLCBar => ({
        high: b.high,
        low: b.low,
        close: b.close,
        ts: b.ts,
      })
    );
    const weeklyBars = getMockBars(ticker, "weekly", 90).map(
      (b): TimedOHLCBar => ({
        high: b.high,
        low: b.low,
        close: b.close,
        ts: b.ts,
      })
    );

    const daily = computeTrendlines(ticker, "daily", dailyBars);
    const weekly = computeTrendlines(ticker, "weekly", weeklyBars);

    return apiSuccess({ ticker, trendlines: [...daily, ...weekly] });
  }

  const { db } = await import("@/lib/db");
  const { trendlines } = await import("@/lib/db/schema");
  const { eq, and } = await import("drizzle-orm");

  if (!db) return apiError("Database not available", 503);

  const results = await db
    .select()
    .from(trendlines)
    .where(and(eq(trendlines.ticker, ticker.toUpperCase()), eq(trendlines.active, true)));

  return apiSuccess({ ticker, trendlines: results });
}
