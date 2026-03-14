# Money OS

Your AI financial consciousness — a 24/7 wealth-building co-pilot that lives inside your AI assistant.

Money OS is not a budgeting app. It's a wealth creation system that finds hidden money drains, optimizes your taxes, calculates your path to financial freedom, and coaches you through the emotional side of money — all through natural conversation.

## What It Does

Money OS covers 5 layers of personal finance, from daily cash flow to generational wealth:

**Layer 1-2: Cash Flow & Tracking**
- `/cash-flow` — Analyze income and expenses through a wealth-building lens, not a budgeting lens. Scores spending by "Freedom Impact" and routes surplus to highest-value destinations.
- `/weekly-pulse` — Weekly financial narrative that connects numbers to goals and freedom progress. Not a dashboard — a story.
- `/leak-scan` — Deep scan for hidden wealth drains: zombie subscriptions, idle cash earning nothing, fee drag, missed employer benefits, tax lot errors. Typical user finds $2K-8K/year in fixable leaks.

**Layer 3: Portfolio Intelligence**
- `/portfolio-check` — Comprehensive health check: concentration risk, dead weight positions, missing diversification, cash reserve adequacy.
- `/rebalance` — Tax-aware rebalancing plan with specific trades, DCA timeline, and execution sequence.
- `/macro-check` — Monitor macroeconomic signals (VIX, yields, dollar, oil, gold) and generate portfolio-specific alerts.
- `/tax-harvest` — Find tax-loss harvesting opportunities with wash sale awareness and substitute position recommendations.

**Layer 4: Tax Strategy**
- `/tax-strategy` — Year-round proactive tax optimization: bracket management, Roth conversions, asset location, equity comp planning.
- `/tax-review` — Analyze a tax return (1040, W-2, 1099s) to find missed deductions, credits, and optimization opportunities.

**Layer 5: Wealth Creation**
- `/freedom` — Calculate your Freedom Number (when work becomes optional) with Monte Carlo simulation and acceleration levers.
- `/decide` — Model any financial decision with probability-weighted scenarios over 1, 5, 10, and 20 years.
- `/life-event` — Financial action plans for life events: job change, baby, marriage, inheritance, home purchase, and more.
- `/generational` — Multi-generational wealth planning: Custodial Roth IRAs, 529 optimization, UGMA/UTMA, age-appropriate teaching.
- `/thesis-to-trades` — Convert an investment thesis into a gap analysis and specific trade recommendations.

**Emotional Intelligence**
- `/courage` — When money feels overwhelming. Validates your feelings, shares real transformation stories, reveals the future you secretly want, and builds a step-by-step game plan. Offers hand-holding or autopilot mode with guardrails.
- `/learn` — Adaptive financial education that meets you where you are. Teaches through context and real decisions, not lectures.

## Quick Start

### As a Claude Plugin

1. Download `money-os.plugin` from the latest release
2. In Claude Desktop (Cowork mode), go to Settings > Plugins
3. Install the plugin file
4. Start with `/courage` if you're feeling overwhelmed, `/freedom` to calculate your Freedom Number, or `/leak-scan` to find hidden money drains

### As a Claude Code Skill

1. Clone this repo
2. The `skills/` and `commands/` directories work directly as Claude Code skills
3. Reference any skill in your Claude Code project

## How It Works

Money OS is a collection of 17 specialized skills with deep reference documents covering financial formulas, decision frameworks, tax rules, and transformation stories. Each skill is a carefully crafted prompt that guides the AI through expert-level financial analysis.

Your data never leaves your computer. All analysis runs locally in your AI assistant's context. No accounts to create, no data to upload, no subscriptions required. [See our security architecture →](docs/security-and-trust.md)

## Repository Structure

```
.claude-plugin/        Plugin manifest
  plugin.json
skills/                17 financial intelligence skills
  cash-flow-intel/     Cash flow analysis + surplus routing
  weekly-pulse/        Financial narrative generator
  freedom-number/      Freedom Number calculator + Monte Carlo
  wealth-leak-scanner/ Hidden wealth drain detector
  financial-courage/   Anxiety/encouragement coaching engine
  financial-educator/  Adaptive financial education
  portfolio-health-check/  Portfolio diagnostics
  rebalancing-plan/    Tax-aware rebalancing
  tax-harvest/         Tax-loss harvesting opportunities
  macro-radar/         Macroeconomic signal monitoring
  tax-strategy/        Year-round tax optimization
  tax-return-analyzer/ Tax return review
  decision-modeler/    Probability-weighted decision analysis
  life-event-router/   Life event financial playbooks
  generational-wealth/ Multi-generational wealth planning
  thesis-to-trades/    Investment thesis gap analysis
  profile-manager/     Persistent financial profile (internal)
  session-review/      Self-evolution engine (internal)
  share-cards/         Shareable HTML artifacts (internal)
commands/              18 slash commands (entry points for skills)
  money-os.md          Unified entry point — intent routing
  setup.md             Guided onboarding
  review.md            Session review + profile updates
docs/                  Architecture, security, PRDs
  security-and-trust.md  Zero-trust security architecture
apps/                  Standalone tools
  freedom-calculator/  Web calculator — top-of-funnel
marketing/             Campaign assets, content kit, launch plan
```

## Try It Now

**60-second Freedom Number calculator** — no signup, no data collection:

→ [apps/freedom-calculator/index.html](apps/freedom-calculator/index.html)

## Roadmap

- **v3.0** — 16 skills, 15 commands. Full coverage across 5 financial layers.
- **v3.1** (current) — Profile persistence, shareable artifacts, unified `/money-os` entry, security architecture, Freedom Calculator web app.
- **v3.2** — Self-evolution loop (auto-updates your profile as you interact), longitudinal tracking.
- **v3.3** — Social Security optimization, RMD management, age-threshold automation.
- **v4.0** — Standalone data layer with cross-platform profile sync.

See [ROADMAP.md](ROADMAP.md) for the full standalone app roadmap.

## Philosophy

- **Empowering, not shaming.** Spending is analyzed as acceleration or deceleration toward freedom, not as moral judgments.
- **Wealth creation, not budgeting.** The goal is financial independence, not penny-counting.
- **Understanding, not just tools.** Every interaction teaches. Tools go out of fashion; understanding compounds.
- **Safety first.** No financial transactions without explicit approval. No data leaves your machine. Every recommendation includes verification steps.

## Principles

- Default to user safety, explicit assumptions, and auditability
- Separate facts, inferences, and opinions in every decision flow
- Treat automation as assisted execution with human approval gates
- Optimize for reproducible analysis, not hype or false certainty

## Docs

- [ROADMAP.md](ROADMAP.md) — Full product roadmap
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture
- [docs/product-principles.md](docs/product-principles.md) — Product principles
- [docs/operations.md](docs/operations.md) — Operational guidelines

## Disclaimer

Money OS provides analytical frameworks and educational content, not financial advice. Always consult qualified professionals for investment, tax, and legal decisions. Past performance and projections do not guarantee future results.

## License

Open source. See [LICENSE](LICENSE) for details.
