import { db } from "../lib/db";
import { bars, watchedTickers, pipelineStatus } from "../lib/db/schema";
import { fetchYahooBars } from "../lib/fetchers/yahoo";
import { eq, sql } from "drizzle-orm";

const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES_MS = 2000;

export async function fetchWeeklyBars() {
  if (!db) throw new Error("Database not configured");

  await db
    .insert(pipelineStatus)
    .values({ jobName: "weekly_bars", status: "running", total: 0, completed: 0 })
    .onConflictDoUpdate({
      target: pipelineStatus.jobName,
      set: { status: "running", updatedAt: new Date() },
    });

  const tickers = await db
    .select()
    .from(watchedTickers)
    .where(eq(watchedTickers.asset, "stock"));

  const total = tickers.length;
  let completed = 0;
  const errors: string[] = [];

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);

    for (const t of batch) {
      try {
        const fetched = await fetchYahooBars(t.ticker, "1wk", "2y");
        for (const bar of fetched) {
          await db
            .insert(bars)
            .values({
              ticker: t.ticker,
              asset: t.asset,
              timeframe: "weekly",
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
                open: sql`EXCLUDED.open`,
                high: sql`EXCLUDED.high`,
                low: sql`EXCLUDED.low`,
                close: sql`EXCLUDED.close`,
                volume: sql`EXCLUDED.volume`,
              },
            });
        }
        completed++;
      } catch (err) {
        errors.push(`${t.ticker}: ${(err as Error).message}`);
      }
    }

    await db
      .update(pipelineStatus)
      .set({ completed, total, updatedAt: new Date() })
      .where(eq(pipelineStatus.jobName, "weekly_bars"));

    if (i + BATCH_SIZE < tickers.length) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
    }
  }

  const finalStatus = errors.length > 0 ? "error" : "idle";
  const today = new Date().toISOString().slice(0, 10);
  await db
    .update(pipelineStatus)
    .set({
      status: finalStatus,
      completed,
      total,
      latestDate: today,
      lastRunAt: new Date(),
      errorMsg: errors.length > 0 ? errors.slice(0, 10).join("; ") : null,
      updatedAt: new Date(),
    })
    .where(eq(pipelineStatus.jobName, "weekly_bars"));

  return { total, completed, errors: errors.length };
}
