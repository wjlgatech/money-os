import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

async function main() {
  // Dynamic import AFTER env is loaded
  const { runFullPipeline } = await import("../jobs/runFullPipeline");

  const args = process.argv.slice(2);
  const tickerFilter = args.length > 0 ? args : undefined;

  console.log(
    tickerFilter
      ? `Running pipeline for: ${tickerFilter.join(", ")}`
      : "Running pipeline for ALL watched tickers"
  );

  const result = await runFullPipeline({ tickerFilter });
  console.log("\nResult:", JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
