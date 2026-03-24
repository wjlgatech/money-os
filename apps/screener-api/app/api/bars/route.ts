import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { config } from "@/lib/config";
import { getMockBars } from "@/lib/mock/bars";

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

  if (!config.hasDatabaseUrl) {
    const bars = getMockBars(ticker, timeframe as "daily" | "weekly", limit);
    return apiSuccess({ ticker, timeframe, bars, total: bars.length });
  }

  // DB path
  const { db } = await import("@/lib/db");
  const { bars } = await import("@/lib/db/schema");
  const { eq, and, desc } = await import("drizzle-orm");

  if (!db) return apiError("Database not available", 503);

  const results = await db
    .select()
    .from(bars)
    .where(and(eq(bars.ticker, ticker.toUpperCase()), eq(bars.timeframe, timeframe)))
    .orderBy(desc(bars.ts))
    .limit(limit);

  return apiSuccess({ ticker, timeframe, bars: results, total: results.length });
}
