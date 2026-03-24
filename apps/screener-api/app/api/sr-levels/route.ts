import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { config } from "@/lib/config";
import { getMockBars } from "@/lib/mock/bars";
import { computeTrendlines, projectTrendline } from "@/lib/engine/trendlineEngine";
import type { TimedOHLCBar } from "@/lib/indicators/zigzag";

interface SRLevel {
  type: "support" | "resistance";
  price: number;
  timeframe: string;
  distancePercent: number;
}

export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");

  if (!ticker) return apiError("ticker parameter is required", 400);

  let trendlineData: Array<{
    type: string;
    timeframe: string;
    x1Ts: string;
    y1: number;
    slope: number;
  }>;
  let currentPrice: number;

  if (!config.hasDatabaseUrl) {
    const dailyBars = getMockBars(ticker, "daily", 90);
    const weeklyBars = getMockBars(ticker, "weekly", 90);
    currentPrice = dailyBars[dailyBars.length - 1]?.close ?? 0;

    const toTimedOHLC = (b: ReturnType<typeof getMockBars>[0]): TimedOHLCBar => ({
      high: b.high, low: b.low, close: b.close, ts: b.ts,
    });

    const daily = computeTrendlines(ticker, "daily", dailyBars.map(toTimedOHLC));
    const weekly = computeTrendlines(ticker, "weekly", weeklyBars.map(toTimedOHLC));
    trendlineData = [...daily, ...weekly].map((tl) => ({
      type: tl.type,
      timeframe: tl.timeframe,
      x1Ts: tl.x1Ts,
      y1: tl.y1,
      slope: tl.slope,
    }));
  } else {
    // DB path would go here
    return apiError("DB path not yet implemented for sr-levels", 501);
  }

  // Project all trendlines to current date
  const now = new Date();
  const levels: SRLevel[] = trendlineData.map((tl) => {
    const projected = projectTrendline(tl, now);
    const distance = ((currentPrice - projected) / currentPrice) * 100;
    return {
      type: tl.type as "support" | "resistance",
      price: Number(projected.toFixed(2)),
      timeframe: tl.timeframe,
      distancePercent: Number(distance.toFixed(2)),
    };
  });

  // Sort: supports by closest below price, resistances by closest above
  const supports = levels
    .filter((l) => l.type === "support")
    .sort((a, b) => Math.abs(a.distancePercent) - Math.abs(b.distancePercent))
    .slice(0, 2);

  const resistances = levels
    .filter((l) => l.type === "resistance")
    .sort((a, b) => Math.abs(a.distancePercent) - Math.abs(b.distancePercent))
    .slice(0, 2);

  return apiSuccess({
    ticker,
    currentPrice,
    supports,
    resistances,
  });
}
