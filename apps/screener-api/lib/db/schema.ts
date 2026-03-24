import {
  pgTable,
  serial,
  varchar,
  numeric,
  bigint,
  timestamp,
  date,
  integer,
  boolean,
  text,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ── Market Data ──────────────────────────────────────────────

export const bars = pgTable(
  "bars",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 20 }).notNull(),
    asset: varchar("asset", { length: 10 }).notNull().default("stock"),
    timeframe: varchar("timeframe", { length: 10 }).notNull(),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    open: numeric("open", { precision: 16, scale: 6 }),
    high: numeric("high", { precision: 16, scale: 6 }),
    low: numeric("low", { precision: 16, scale: 6 }),
    close: numeric("close", { precision: 16, scale: 6 }),
    volume: bigint("volume", { mode: "number" }),
  },
  (table) => [
    uniqueIndex("idx_bars_unique").on(table.ticker, table.timeframe, table.ts),
    index("idx_bars_ticker_tf").on(table.ticker, table.timeframe),
  ]
);

export const vixData = pgTable("vix_data", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  close: numeric("close", { precision: 8, scale: 4 }),
});

export const earningsCalendar = pgTable(
  "earnings_calendar",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 20 }).notNull(),
    reportDate: date("report_date").notNull(),
    timeOfDay: varchar("time_of_day", { length: 5 }),
  },
  (table) => [
    uniqueIndex("idx_earnings_unique").on(table.ticker, table.reportDate),
    index("idx_earnings_date").on(table.reportDate),
  ]
);

// ── Analysis ─────────────────────────────────────────────────

export const trendlines = pgTable(
  "trendlines",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 20 }).notNull(),
    timeframe: varchar("timeframe", { length: 10 }).notNull(),
    type: varchar("type", { length: 10 }).notNull(), // 'support' | 'resistance'
    x1Ts: timestamp("x1_ts", { withTimezone: true }).notNull(),
    x2Ts: timestamp("x2_ts", { withTimezone: true }).notNull(),
    y1: numeric("y1", { precision: 16, scale: 6 }),
    y2: numeric("y2", { precision: 16, scale: 6 }),
    slope: numeric("slope", { precision: 20, scale: 10 }),
    touches: integer("touches").default(2),
    score: numeric("score", { precision: 8, scale: 4 }),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_trendlines_ticker").on(table.ticker, table.active),
  ]
);

export const scanResults = pgTable("scan_results", {
  id: serial("id").primaryKey(),
  ticker: varchar("ticker", { length: 20 }).notNull(),
  asset: varchar("asset", { length: 10 }).notNull().default("stock"),
  price: numeric("price", { precision: 16, scale: 6 }),
  signalType: varchar("signal_type", { length: 10 }), // 'TL' | 'IX' | 'W'
  level: numeric("level", { precision: 16, scale: 6 }),
  distanceAtr: numeric("distance_atr", { precision: 8, scale: 4 }),
  distanceUsd: numeric("distance_usd", { precision: 12, scale: 4 }),
  zone: varchar("zone", { length: 10 }), // 'ENTRY' | 'ALERT'
  timeframe: varchar("timeframe", { length: 10 }),
  direction: varchar("direction", { length: 10 }), // 'support' | 'resistance'
  sector: varchar("sector", { length: 50 }),
  earningsDate: date("earnings_date"),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).defaultNow(),
});

export const tradingSignals = pgTable(
  "trading_signals",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 20 }).notNull(),
    timeframe: varchar("timeframe", { length: 10 }).notNull(),
    signalType: varchar("signal_type", { length: 50 }).notNull(),
    direction: varchar("direction", { length: 5 }), // 'bull' | 'bear'
    detail: text("detail"),
    entryPrice: numeric("entry_price", { precision: 16, scale: 6 }),
    stopPrice: numeric("stop_price", { precision: 16, scale: 6 }),
    signalDate: date("signal_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_signals_ticker_date").on(table.ticker, table.signalDate),
  ]
);

// ── User Configuration ───────────────────────────────────────

export const watchedTickers = pgTable("watched_tickers", {
  id: serial("id").primaryKey(),
  ticker: varchar("ticker", { length: 20 }).notNull().unique(),
  asset: varchar("asset", { length: 10 }).notNull().default("stock"),
  sector: varchar("sector", { length: 50 }),
  source: varchar("source", { length: 20 }).notNull().default("sector"), // 'portfolio' | 'watchlist' | 'sector'
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
});

// ── Pipeline ─────────────────────────────────────────────────

export const pipelineStatus = pgTable("pipeline_status", {
  id: serial("id").primaryKey(),
  jobName: varchar("job_name", { length: 50 }).notNull().unique(),
  total: integer("total").default(0),
  completed: integer("completed").default(0),
  latestDate: date("latest_date"),
  status: varchar("status", { length: 20 }).default("idle"), // 'idle' | 'running' | 'error'
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  errorMsg: text("error_msg"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Types ────────────────────────────────────────────────────

export type Bar = typeof bars.$inferSelect;
export type NewBar = typeof bars.$inferInsert;
export type Trendline = typeof trendlines.$inferSelect;
export type ScanResult = typeof scanResults.$inferSelect;
export type TradingSignal = typeof tradingSignals.$inferSelect;
export type WatchedTicker = typeof watchedTickers.$inferSelect;
export type PipelineJob = typeof pipelineStatus.$inferSelect;
