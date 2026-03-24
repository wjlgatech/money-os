import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { db } from "@/lib/db";
import { watchedTickers } from "@/lib/db/schema";
import { config } from "@/lib/config";

interface SyncTicker {
  ticker: string;
  asset?: string;
  source?: string;
  sector?: string;
}

export async function POST(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  if (!config.hasDatabaseUrl || !db) {
    return apiError("Database not configured", 503);
  }

  try {
    const body = await req.json();
    const { tickers } = body as { tickers: SyncTicker[] };

    if (!Array.isArray(tickers)) {
      return apiError("tickers array is required", 400);
    }

    let added = 0;
    for (const t of tickers) {
      if (!t.ticker) continue;
      const result = await db
        .insert(watchedTickers)
        .values({
          ticker: t.ticker.toUpperCase(),
          asset: t.asset ?? "stock",
          source: t.source ?? "portfolio",
          sector: t.sector ?? null,
        })
        .onConflictDoNothing()
        .returning();
      if (result.length > 0) added++;
    }

    return apiSuccess({ synced: tickers.length, added });
  } catch (err) {
    return apiError((err as Error).message);
  }
}
