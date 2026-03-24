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

  // Alpaca Data API
  alpacaApiKey: process.env.ALPACA_API_KEY ?? "",
  alpacaApiSecret: process.env.ALPACA_API_SECRET ?? "",
  alpacaBaseUrl:
    process.env.ALPACA_BASE_URL ?? "https://data.alpaca.markets",

  // Alpaca Trading API (paper or live)
  hasAlpacaTrading: Boolean(
    process.env.ALPACA_TRADING_KEY && process.env.ALPACA_TRADING_SECRET
  ),
  alpacaTradingKey: process.env.ALPACA_TRADING_KEY ?? "",
  alpacaTradingSecret: process.env.ALPACA_TRADING_SECRET ?? "",
  // Live trading requires BOTH flags set — defense against accidental live mode
  alpacaPaperMode:
    process.env.ALPACA_PAPER_MODE !== "false" ||
    process.env.ALPACA_LIVE_CONFIRM !== "yes-i-understand",

  // Financial Modeling Prep (fundamentals + earnings)
  fmpApiKey: process.env.FMP_API_KEY ?? "",

  // Plaid (Fidelity, Schwab, Vanguard connector)
  plaidEnv: (process.env.PLAID_ENV ?? "sandbox") as "sandbox" | "development" | "production",
  plaidClientId: process.env.PLAID_CLIENT_ID ?? "",
  plaidSecret: process.env.PLAID_SECRET ?? "",

  // Portfolio
  initialCapital: Number(process.env.INITIAL_CAPITAL ?? "100000"),

  // Auth
  screenerApiToken: process.env.SCREENER_API_TOKEN ?? "",

  // Cron
  cronSecret: process.env.CRON_SECRET ?? "",
} as const;
