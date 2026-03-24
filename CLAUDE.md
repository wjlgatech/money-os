# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Is This

Money OS is a financial AI co-pilot (Claude plugin) with 20 skills, a market screening data service, paper trading, and a backtest engine. It covers cash flow, portfolio intelligence, tax strategy, wealth creation, and emotional coaching — all with real market data and zero-trust local-only architecture for personal financial data.

## Commands

```bash
# Control center (prototype dashboard)
npm run dev              # Start on port 3100
npm run test:smoke       # Smoke test

# Screener API (market data service)
npm run dev:screener     # Start on port 3001
npm run test:screener    # Run 53 tests

# Inside apps/screener-api/:
npm test                 # All tests
npm run test:unit        # Indicator + engine unit tests
npm run test:functional  # Full pipeline test
npx tsx scripts/run-pipeline.ts              # Fetch data + compute trendlines/signals for all tickers
npx tsx scripts/run-pipeline.ts AAPL NVDA    # Specific tickers only
npx tsx scripts/run-backtest.ts              # Backtest against historical data
npx tsx scripts/param-sweep.ts               # Optimize trading parameters
npx tsx scripts/daily-auto-trader.ts         # Dry run — show trade proposals
npx tsx scripts/daily-auto-trader.ts --execute  # Execute paper trades
```

## Architecture

**Two-layer system:**
1. **Claude skills** (markdown) — handle user interaction, portfolio context, ADEPT coaching
2. **Screener data service** (Next.js) — handles market data, computation engines, paper trading

**Skills** live in `skills/<name>/SKILL.md`. Key new skills:
- `security-screener` — market scanning with portfolio-aware filtering
- `investment-navigator` — GPS-style `/invest` command with ADEPT coaching framework

**Screener API** (`apps/screener-api/`) — Next.js 15 + TypeScript + Supabase PostgreSQL:
- `lib/indicators/` — ATR, RSI, MACD, Zigzag (pure functions, fully tested)
- `lib/engine/` — trendlineEngine, scannerEngine, signalEngine, backtestEngine, paperTrader, tradeGate
- `app/api/` — 12 REST endpoints (bars, trendlines, sr-levels, scanner, signals, vix, pipeline, universe, paper-trading, trade-gate)
- `scripts/` — Pipeline runner, backtester, parameter sweep, daily auto-trader
- Data: 110 tickers, Yahoo Finance (no API key needed), Supabase PostgreSQL

**Profile persistence** uses local markdown files (gitignored):
- `profile/financial-identity.md`, `profile/holdings.md`, `profile/goals.md`, `profile/history.md`

## Key Design Principles

- **Local-only personal data**: Financial data never leaves the user's machine. Market data (public prices) lives in Supabase.
- **ADEPT coaching**: Every interaction teaches — Analogy, Diagram, Example, Plain interpretation, Technical abstraction. See `skills/investment-navigator/references/adept-framework.md`.
- **GPS, not menu**: Users state intentions ("I have $5K, grow it"), the system navigates. No jargon required.
- **Backtest before live**: All trading strategies must prove profitable in backtesting before paper trading, and in paper trading before live execution.
- **Human gate**: Machine proposes trades, human approves. Configurable auto-approve rules in `tradeGate.ts`.

## Current State (v4.0)

20 skills, 21 commands, screener data service with real market data (110 tickers), backtest engine, paper trading portfolio ($100K virtual), trade gate with approval workflow. Backtest shows the system needs a market regime filter before live trading — it loses money buying support bounces in bear markets.
