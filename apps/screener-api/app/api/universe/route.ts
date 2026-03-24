import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { db } from "@/lib/db";
import { watchedTickers } from "@/lib/db/schema";
import { config } from "@/lib/config";
import { MOCK_TICKERS } from "@/lib/mock/tickers";

export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  if (!config.hasDatabaseUrl || !db) {
    return apiSuccess({ tickers: MOCK_TICKERS, total: MOCK_TICKERS.length });
  }

  try {
    const tickers = await db.select().from(watchedTickers);
    return apiSuccess({ tickers, total: tickers.length });
  } catch (err) {
    return apiError((err as Error).message);
  }
}

export async function POST(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  if (!config.hasDatabaseUrl || !db) {
    return apiError("Database not configured", 503);
  }

  try {
    const body = await req.json();
    const { ticker, asset = "stock", source = "watchlist", sector } = body;

    if (!ticker || typeof ticker !== "string") {
      return apiError("ticker is required", 400);
    }

    const result = await db
      .insert(watchedTickers)
      .values({
        ticker: ticker.toUpperCase(),
        asset,
        source,
        sector: sector ?? null,
      })
      .onConflictDoNothing()
      .returning();

    return apiSuccess({ added: result.length > 0, ticker: ticker.toUpperCase() }, 201);
  } catch (err) {
    return apiError((err as Error).message);
  }
}
