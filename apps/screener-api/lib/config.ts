export const config = {
  // Feature flags based on available env vars
  hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  hasAlpacaKeys: Boolean(
    process.env.ALPACA_API_KEY && process.env.ALPACA_API_SECRET
  ),
  hasRedis: Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ),
  isProduction: process.env.NODE_ENV === "production",

  // Database
  databaseUrl: process.env.DATABASE_URL ?? "",

  // Cache (Upstash Redis)
  redisRestUrl: process.env.UPSTASH_REDIS_REST_URL ?? "",
  redisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",

  // Alpaca
  alpacaApiKey: process.env.ALPACA_API_KEY ?? "",
  alpacaApiSecret: process.env.ALPACA_API_SECRET ?? "",
  alpacaBaseUrl:
    process.env.ALPACA_BASE_URL ?? "https://data.alpaca.markets",

  // Auth
  screenerApiToken: process.env.SCREENER_API_TOKEN ?? "",

  // Cron
  cronSecret: process.env.CRON_SECRET ?? "",
} as const;
