import { config } from "../config";

async function seed() {
  if (!config.hasDatabaseUrl) {
    console.log("No DATABASE_URL configured. Skipping seed.");
    process.exit(0);
  }

  // Dynamic import to avoid loading DB module when not needed
  const { db } = await import("./index");
  const { watchedTickers, pipelineStatus } = await import("./schema");

  if (!db) {
    console.log("Database not available. Skipping seed.");
    process.exit(0);
  }

  const sp500 = (await import("../../data/sp500.json", { with: { type: "json" } })).default as Array<{
    ticker: string;
    sector: string;
  }>;

  console.log(`Seeding ${sp500.length} tickers...`);

  let added = 0;
  for (const entry of sp500) {
    const result = await db
      .insert(watchedTickers)
      .values({
        ticker: entry.ticker,
        asset: "stock",
        sector: entry.sector,
        source: "sector",
      })
      .onConflictDoNothing()
      .returning();
    if (result.length > 0) added++;
  }

  console.log(`Added ${added} new tickers (${sp500.length - added} already existed).`);

  // Seed pipeline jobs
  const jobNames = [
    "daily_bars",
    "weekly_bars",
    "vix",
    "trendline_engine",
    "signal_generator",
    "scanner_engine",
  ];

  for (const jobName of jobNames) {
    await db
      .insert(pipelineStatus)
      .values({ jobName, status: "idle" })
      .onConflictDoNothing();
  }

  console.log(`Pipeline jobs initialized: ${jobNames.length}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
