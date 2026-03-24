# Roadmap

## Current state: v4.0

Money OS is a financial AI co-pilot with 20 skills, a market screening data service, paper trading, and a backtest engine — all running against real market data.

## Completed milestones

### v3.0–3.1: Foundation (shipped)
- 17 financial skills across 5 layers (cash flow, portfolio, tax, wealth, emotional)
- Profile persistence in local markdown files
- Unified `/money-os` intent router
- Zero-trust local-only architecture

### v4.0: Market Intelligence + Autonomous Trading Foundation (shipped)
- **Security Screener data service** — Next.js 15, TypeScript, Supabase PostgreSQL
- **4 technical indicators** — ATR(14), RSI(14), MACD(12,26,9), Zigzag pivot detection
- **3 computation engines** — trendline detection, VIX-adjusted scanner, signal generator
- **Real market data** — 110 tickers via Yahoo Finance, daily + weekly OHLCV
- **Backtest engine** — walk-forward simulation with parameter sweep optimization
- **Paper trading** — virtual $100K portfolio with stop-loss/take-profit, trade proposals
- **Trade gate** — human approval pipeline with configurable auto-approve rules
- **Investment Navigator** — GPS-style `/invest` command (say a goal, get a step-by-step path)
- **ADEPT coaching** — Analogy → Diagram → Example → Plain interpretation → Technical abstraction
- **53 passing tests** (unit + functional)
- **12 API endpoints** serving real data

PRDs:
- [docs/prd/security-screener/Architecture.md](docs/prd/security-screener/Architecture.md)
- [docs/prd/security-screener/PRD.md](docs/prd/security-screener/PRD.md)
- [docs/prd/security-screener/Roadmap.md](docs/prd/security-screener/Roadmap.md)

## Upcoming milestones

### v4.1: Expanded Coverage + Smarter Signals
Goal: more asset classes, fundamental data, and a regime filter that stops buying bounces in bear markets.

Deliverables:
- Crypto support via CoinGecko (top 20 by market cap)
- Fundamental data via Financial Modeling Prep (P/E, revenue growth, margins)
- Earnings calendar with trendline enrichment
- Market regime filter (bull/bear/sideways detection) to gate entry signals
- Sector rotation signals

### v4.2: Broker Integration + Human-Gated Live Trading
Goal: connect to a real broker (Alpaca) for paper and live trading with human oversight.

Deliverables:
- Alpaca API integration (paper trading mode first)
- Approval workflow: machine proposes → human approves → machine executes
- Real-time order execution at market open
- Trade journal with full audit trail
- Gradual auto-approve thresholds based on track record

### v5.0: Autonomous Trading Within Bounds
Goal: machine handles routine decisions within pre-approved rules; human handles exceptions.

Deliverables:
- Rule-based auto-execution: "buy up to 3% of portfolio in ENTRY zone stocks with 2+ confirming signals"
- Portfolio-level risk management: max drawdown limits, correlation-aware position sizing
- Continuous strategy learning: compare signal predictions vs outcomes, adjust weights
- Anomaly detection: alert human when market behavior deviates from historical patterns

## Original milestone framework

The original M1–M5 framework remains the architectural north star:

| Milestone | Original Goal | Current Status |
|-----------|--------------|----------------|
| M1. Foundation | Domain models, controls, observability | Partially shipped (schema in screener-api) |
| M2. Aggregation | Multi-broker connectors, unified views | Planned for v4.2 (Alpaca first) |
| M3. Advisor | Portfolio intelligence, scenarios | Shipped (screener + signal + navigator) |
| M4. Execution | Approval workflows, trade routing | Shipped (trade gate + paper trading) |
| M5. Learning | Backtesting, strategy improvement | Shipped (backtest engine + param sweep) |

PRDs for original milestones:
- [docs/prd/m1-foundation/PRD.md](docs/prd/m1-foundation/PRD.md)
- [docs/prd/m2-aggregation/PRD.md](docs/prd/m2-aggregation/PRD.md)
- [docs/prd/m3-advisor/PRD.md](docs/prd/m3-advisor/PRD.md)
- [docs/prd/m4-execution/PRD.md](docs/prd/m4-execution/PRD.md)
- [docs/prd/m5-learning/PRD.md](docs/prd/m5-learning/PRD.md)

## Progression to autonomous trading

```
TODAY         Paper trading with daily pipeline, human reviews every trade
MONTH 1       Daily auto-pipeline via Vercel Cron, weekly human review
MONTH 2       Alpaca paper trading (real broker simulation)
MONTH 3       Alpaca live with small capital ($1-5K), human approves every trade
MONTH 6+      Gradual auto-approve within pre-set rules
```
