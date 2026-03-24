CREATE TABLE "bars" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"asset" varchar(10) DEFAULT 'stock' NOT NULL,
	"timeframe" varchar(10) NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"open" numeric(16, 6),
	"high" numeric(16, 6),
	"low" numeric(16, 6),
	"close" numeric(16, 6),
	"volume" bigint
);
--> statement-breakpoint
CREATE TABLE "earnings_calendar" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"report_date" date NOT NULL,
	"time_of_day" varchar(5)
);
--> statement-breakpoint
CREATE TABLE "pipeline_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_name" varchar(50) NOT NULL,
	"total" integer DEFAULT 0,
	"completed" integer DEFAULT 0,
	"latest_date" date,
	"status" varchar(20) DEFAULT 'idle',
	"last_run_at" timestamp with time zone,
	"error_msg" text,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "pipeline_status_job_name_unique" UNIQUE("job_name")
);
--> statement-breakpoint
CREATE TABLE "scan_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"asset" varchar(10) DEFAULT 'stock' NOT NULL,
	"price" numeric(16, 6),
	"signal_type" varchar(10),
	"level" numeric(16, 6),
	"distance_atr" numeric(8, 4),
	"distance_usd" numeric(12, 4),
	"zone" varchar(10),
	"timeframe" varchar(10),
	"direction" varchar(10),
	"sector" varchar(50),
	"earnings_date" date,
	"scanned_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trading_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"timeframe" varchar(10) NOT NULL,
	"signal_type" varchar(50) NOT NULL,
	"direction" varchar(5),
	"detail" text,
	"entry_price" numeric(16, 6),
	"stop_price" numeric(16, 6),
	"signal_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trendlines" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"timeframe" varchar(10) NOT NULL,
	"type" varchar(10) NOT NULL,
	"x1_ts" timestamp with time zone NOT NULL,
	"x2_ts" timestamp with time zone NOT NULL,
	"y1" numeric(16, 6),
	"y2" numeric(16, 6),
	"slope" numeric(20, 10),
	"touches" integer DEFAULT 2,
	"score" numeric(8, 4),
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vix_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"close" numeric(8, 4),
	CONSTRAINT "vix_data_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "watched_tickers" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"asset" varchar(10) DEFAULT 'stock' NOT NULL,
	"sector" varchar(50),
	"source" varchar(20) DEFAULT 'sector' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "watched_tickers_ticker_unique" UNIQUE("ticker")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bars_unique" ON "bars" USING btree ("ticker","timeframe","ts");--> statement-breakpoint
CREATE INDEX "idx_bars_ticker_tf" ON "bars" USING btree ("ticker","timeframe");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_earnings_unique" ON "earnings_calendar" USING btree ("ticker","report_date");--> statement-breakpoint
CREATE INDEX "idx_earnings_date" ON "earnings_calendar" USING btree ("report_date");--> statement-breakpoint
CREATE INDEX "idx_signals_ticker_date" ON "trading_signals" USING btree ("ticker","signal_date");--> statement-breakpoint
CREATE INDEX "idx_trendlines_ticker" ON "trendlines" USING btree ("ticker","active");