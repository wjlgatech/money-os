import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { config } from "@/lib/config";
import { getMockSignals } from "@/lib/mock/bars";

export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const ticker = searchParams.get("ticker");
  const days = parseInt(searchParams.get("days") ?? "7", 10);

  if (!config.hasDatabaseUrl) {
    let signals = getMockSignals();
    if (ticker) {
      signals = signals.filter((s) => s.ticker === ticker.toUpperCase());
    }
    return apiSuccess({ signals: signals.slice(0, limit), total: signals.length });
  }

  const { db } = await import("@/lib/db");
  const { tradingSignals } = await import("@/lib/db/schema");
  const { eq, and, desc, gte } = await import("drizzle-orm");

  if (!db) return apiError("Database not available", 503);

  const cutoffDate = new Date(Date.now() - days * 86400000)
    .toISOString()
    .slice(0, 10);

  const conditions = [gte(tradingSignals.signalDate, cutoffDate)];
  if (ticker) {
    conditions.push(eq(tradingSignals.ticker, ticker.toUpperCase()));
  }

  const results = await db
    .select()
    .from(tradingSignals)
    .where(and(...conditions))
    .orderBy(desc(tradingSignals.signalDate))
    .limit(limit);

  return apiSuccess({ signals: results, total: results.length });
}
