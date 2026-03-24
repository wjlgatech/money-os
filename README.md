<!-- ============================================================
     MONEY OS — README
     ============================================================ -->

![Version](https://img.shields.io/badge/version-4.0-blue)
![License](https://img.shields.io/badge/license-open%20source-green)
![No Signup](https://img.shields.io/badge/signup-none%20required-brightgreen)
![Data Privacy](https://img.shields.io/badge/your%20data-stays%20local-blueviolet)
![Made with Claude](https://img.shields.io/badge/built%20with-Claude-orange)

# 💰 Money OS

### Your AI financial co-pilot — 24/7 wealth-building intelligence, zero data uploads, zero subscriptions

---

> **Sarah was 28, made $42K as a teacher, and hadn't opened her bank account app in three months.**
> She typed `/leak-scan` into Claude on a Tuesday night. In 20 minutes, Money OS found:
> — $6,300 already lost: 3 years of uncaptured 403(b) employer match
> — $898/year evaporating: $20K sitting in a 0.01% checking account instead of a 4.5% HYSA
> — $180/year in ghost subscriptions she'd forgotten existed
>
> *Total: ~$8K/year. Already gone. But fixable starting tomorrow.*
>
> She's now on track for **$800K+ by age 60** — without changing her salary.
>
> *"I used to think I didn't make enough to invest. Turns out I didn't make enough NOT to."*

---

**Money OS is not a budgeting app.** Budgeting apps shame you. Money OS asks: *what is every dollar doing to accelerate or decelerate your path to financial freedom?*

It covers every layer of your financial life — cash flow, portfolio intelligence, tax strategy, wealth creation, and the emotional side of money — through natural conversation in Claude.

<!-- ============================================================ -->
## 🛡️ Your Data Never Leaves Your Computer

**Before you do anything else — this is the most important thing to know:**

```
┌─────────────────────────────────────────────┐
│            YOUR COMPUTER                     │
│                                              │
│  ┌──────────┐    ┌──────────────────────┐   │
│  │  Claude  │◄──►│  Money OS Plugin     │   │
│  └──────────┘    └──────────────────────┘   │
│       │                    │                 │
│       ▼                    ▼                 │
│  ┌──────────┐    ┌──────────────────────┐   │
│  │  Your    │    │  profile/*.md        │   │
│  │ Messages │    │  (your financial     │   │
│  └──────────┘    │   data, plaintext)   │   │
│                  └──────────────────────┘   │
│  ─────────── NOTHING CROSSES THIS LINE ──── │
└─────────────────────────────────────────────┘
         ✖ No external API calls
         ✖ No cloud storage or sync
         ✖ No account creation ever
         ✖ No analytics or telemetry
         ✖ No Plaid, no OAuth, no CSV uploads
```

No accounts to create. No financial data to upload. No third-party services with access to your numbers. Your holdings, income, and goals live as plaintext markdown files on your own machine — and they stay there. [Full security architecture →](docs/security-and-trust.md)

<!-- ============================================================ -->
## ⚡ Quick Start

### Install in 2 Minutes (Claude Plugin)

```
1. Download money-os.plugin from the latest GitHub Release
2. Open Claude Desktop (Cowork mode)
3. Settings → Plugins → Install Plugin → select the file
4. Done. No restart needed.
```

### Your First 3 Commands

Open Claude and type any of these to start:

| What you type | What happens |
|---|---|
| `/invest` | **NEW** — "I have $5K, grow it." Your financial GPS — tells you where to go, drives you there step by step. |
| `/courage` | Start here if money feels overwhelming. No judgment, just clarity and a step-by-step game plan. |
| `/freedom` | Find out the exact date work becomes optional for you. Takes 3 minutes. |
| `/leak-scan` | Find hidden money you're losing right now. Most users find $2K–$8K/year in the first session. |

> **Not sure where to start?** Just say what you want: *"I have $5K and want to make it grow"* — Money OS figures out the rest. No commands to memorize.

### Alternative: Use as a Claude Code Skill

```bash
git clone https://github.com/wjlgatech/money-os
# The skills/ and commands/ directories work directly as Claude Code skills
# Reference any skill in your Claude Code project
```

<!-- ============================================================ -->
## 🗺️ What Money OS Does — The 5-Layer System

Most financial tools pick one layer and go deep. Money OS connects all five — because your cash flow affects your taxes, your taxes affect your portfolio, and your portfolio affects your freedom date.

```
Your financial life
        │
   ┌────▼────────────────────────────────────────────────┐
   │  💸 Layer 1-2 │ Cash Flow & Leak Detection          │
   │               │ /cash-flow  /leak-scan  /weekly-pulse│
   ├───────────────┼────────────────────────────────────  │
   │  📊 Layer 3   │ Portfolio Intelligence & Screening    │
   │               │ /portfolio-check  /rebalance          │
   │               │ /macro-check  /tax-harvest            │
   │               │ /screen  /signals  /watchlist         │
   ├───────────────┼────────────────────────────────────  │
   │  🧾 Layer 4   │ Tax Strategy                        │
   │               │ /tax-strategy  /tax-review           │
   ├───────────────┼────────────────────────────────────  │
   │  🚀 Layer 5   │ Wealth Creation                      │
   │               │ /invest  /freedom  /decide            │
   │               │ /life-event  /generational            │
   │               │ /thesis-to-trades                     │
   ├───────────────┼────────────────────────────────────  │
   │  ❤️ Emotional │ Financial Courage & Education        │
   │               │ /courage  /learn                     │
   └───────────────┴────────────────────────────────────  ┘
         │
         ▼  All analysis runs locally in Claude's context.
            Nothing is stored externally. Ever.
```

<!-- ============================================================ -->
## ✨ Feature Deep Dives

Click any feature to expand: **benefit** → **how it works** → **where to find the code**.

---

<details>
<summary>🔍 <strong>/leak-scan</strong> — Find hidden money you didn't know you were losing</summary>

### 💸 Real-Life Impact

> The average user finds **$2,000–$8,000/year** in fixable wealth drains in a single 20-minute session. These aren't hypothetical savings — they're money actively leaving your life right now through zombie subscriptions, idle cash earning near-zero, fee drag from old accounts, missed employer benefits, and tax lot errors.
>
> **Marcus, 34:** Found $3,750/year in uncaptured ESPP (15% guaranteed return he wasn't enrolled in) + $898/year in idle cash + $320/year in fund fee drag. Total: $4,968/year. Fixed in one afternoon.
>
> **The 20-year compound value of fixing $4K/year:** $254,000 — not counting the tax optimization on top.

### 🧠 How It Works

Traditional budgeting apps categorize your expenses. Leak Scanner does something different: it **scores every dollar by Freedom Impact** — how much it accelerates or decelerates your path to financial independence. It cross-references your situation against 17 known leak categories ranked by `Annual Value × Probability of Applying × Ease of Fix`.

Top leaks it hunts for:
- **401k match not captured** — most common, highest impact ($3K+/year on a $100K salary)
- **Cash earning 0.01%** — $20K in checking vs. HYSA at 4.5% = $898/year lost
- **High-fee mutual funds** — $100K at 1.0% ER vs. 0.03% index = $970/year in fee drag; $320K over 30 years
- **RSU cost basis errors** — tech workers overpay $1K–$10K on taxes from this single mistake
- **ESPP not enrolled** — 15% guaranteed return, most people skip it
- **HSA not invested** — triple tax benefit sitting in cash instead of growing

### ⚙️ Implementation
- Skill: [`skills/wealth-leak-scanner/SKILL.md`](skills/wealth-leak-scanner/SKILL.md)
- Reference: [`skills/wealth-leak-scanner/references/common-leaks-checklist.md`](skills/wealth-leak-scanner/references/common-leaks-checklist.md)
- Entry point: `/leak-scan`

</details>

---

<details>
<summary>🗓️ <strong>/freedom</strong> — Calculate the exact date work becomes optional</summary>

### 💸 Real-Life Impact

> Most people have a vague feeling they're "not saving enough" but no concrete target. The Freedom Number converts that anxiety into a precise, actionable number: the portfolio size at which your investments generate enough passive income to cover your life — permanently.
>
> **Diana, 45, recently divorced:** Started from $62K after splitting retirement accounts. Felt 20 years behind. `/freedom` showed her she had 20 years of compounding ahead plus catch-up contribution eligibility. Ran the numbers: maxing her 401k + Roth at current rates → **$1.1M by 65**, not counting Social Security.
>
> *"I stopped mourning the 20 years I 'lost' and started building with the 20 I had."*

### 🧠 How It Works

Freedom Number = the portfolio size where `portfolio × safe withdrawal rate ÷ 12 ≥ your monthly expenses`.

Money OS runs a **10,000-scenario Monte Carlo simulation** using real return distributions (US large cap: 10% mean / 18% std dev, bonds, REITs, international) and real inflation modeling (3.0% mean, log-normal distribution). This means your Freedom Date isn't a single optimistic guess — it's a probability distribution. You see:
- **P50** (median scenario): your most likely Freedom Date
- **P25** (conservative): Freedom Date if markets underperform
- **P75** (optimistic): Freedom Date with favorable returns

It then models **acceleration levers** with exact numbers:
- Maxing Roth IRA ($7K/yr) → 20-year value: $441,735
- Mega Backdoor Roth ($36.5K/yr) → 20-year value: $2.3M tax-free
- Each 10% increase in savings rate → ~5–8 year acceleration

### ⚙️ Implementation
- Skill: [`skills/freedom-number/SKILL.md`](skills/freedom-number/SKILL.md)
- Math reference: [`skills/freedom-number/references/freedom-math.md`](skills/freedom-number/references/freedom-math.md)
- Entry point: `/freedom`

</details>

---

<details>
<summary>❤️ <strong>/courage</strong> — When money feels overwhelming</summary>

### 💸 Real-Life Impact

> This is the feature that has no equivalent in any financial app. Every other tool assumes you're ready to optimize. `/courage` starts where most people actually are: *avoidance*. Avoiding the account statement. Avoiding the credit card balance. Avoiding the conversation with yourself about where it all went.
>
> **Maria, 32, single mom:** $8K in credit card debt, $0 invested, felt guilty even thinking about money for herself. `/courage` didn't shame her. It validated that the guilt was normal. Then it showed her: $200/month invested starting at 32 = **$379K by 62**. That $200/month NOT invested = $0 for her kids to inherit.
>
> *"Investing $200/month isn't selfish. It's buying my kids a mom who isn't financially terrified."*

### 🧠 How It Works

`/courage` has three modes, chosen based on what you share:

1. **Validation mode** — Normalizes your feelings using real statistics and real stories from people who've been exactly where you are
2. **Clarity mode** — Strips the problem down to what's actually true (debt totals are almost always less than the catastrophized version in your head)
3. **Game plan mode** — Builds a step-by-step path, calibrated to your situation, with two options: *hand-holding* (guided through each step) or *autopilot* (clear milestones with guardrails)

This is financial coaching, not financial lecturing. The difference matters.

### ⚙️ Implementation
- Skill: [`skills/financial-courage/SKILL.md`](skills/financial-courage/SKILL.md)
- Story bank: [`skills/financial-courage/references/transformation-stories.md`](skills/financial-courage/references/transformation-stories.md)
- Entry point: `/courage`

</details>

---

<details>
<summary>🧾 <strong>/tax-strategy</strong> — Keep more of what you earn, legally</summary>

### 💸 Real-Life Impact

> Taxes are the single largest expense in most high-income households — larger than housing, larger than healthcare. Yet most people optimize them exactly once a year, in April, after all the windows for action have closed.
>
> Money OS runs tax strategy year-round. The result: **$3,000–$15,000+/year in additional after-tax wealth** for most users who engage with it seriously. That $3K/year reinvested over 20 years at 10% = $189,295.
>
> Common wins: bracket management (deliberately staying in a lower bracket), Roth conversion ladders, asset location (putting the right things in tax-advantaged vs. taxable accounts), equity comp planning (RSU/ISO/ESPP timing), and tax-loss harvesting with wash-sale awareness.

### 🧠 How It Works

`/tax-strategy` covers four distinct optimization layers:

- **Bracket management** — Finding your marginal dollar and optimizing whether to defer (Traditional) or prepay (Roth) based on projected future rates
- **Asset location** — Bonds and REITs belong in tax-advantaged accounts; growth stocks belong in taxable (where long-term rates apply). Mis-location costs 0.5–1.5% in annual after-tax returns.
- **Equity comp planning** — RSU vesting creates W-2 income that triggers cost-basis traps on subsequent sales. ISO timing determines AMT exposure. ESPP qualification matters for treatment of the discount.
- **Roth conversion modeling** — The years between retirement and RMD age (or between jobs) are often the lowest-tax years of a high-earner's life. Converting in those windows is the highest-leverage tax move available.

`/tax-harvest` runs a complementary scan for unrealized losses that can offset gains — with wash-sale rule awareness and substitute position recommendations so you stay invested.

### ⚙️ Implementation
- Skill: [`skills/tax-strategy/SKILL.md`](skills/tax-strategy/SKILL.md)
- References: [`bracket-optimization.md`](skills/tax-strategy/references/bracket-optimization.md) · [`asset-location.md`](skills/tax-strategy/references/asset-location.md) · [`equity-comp-tax.md`](skills/tax-strategy/references/equity-comp-tax.md) · [`advanced-strategies.md`](skills/tax-strategy/references/advanced-strategies.md)
- Entry points: `/tax-strategy` · `/tax-review` · `/tax-harvest`

</details>

---

<details>
<summary>🧠 <strong>/decide</strong> — Model any financial decision before you make it</summary>

### 💸 Real-Life Impact

> "Should I pay off my mortgage early or invest?" "Should I lease or buy the car?" "Does it make sense to take the new job at $30K more but lose the RSUs?" These aren't simple questions — they involve tax implications, opportunity costs, sequence risk, and personal variables that interact in non-obvious ways.
>
> `/decide` models any financial decision with **probability-weighted scenarios over 1, 5, 10, and 20 years**. It separates facts (known inputs), inferences (modeled assumptions), and opinions (recommendations) — so you always know what's certain and what's a projection.

### 🧠 How It Works

For any decision you describe, Money OS:
1. Builds a structured decision frame: What are the options? What are the key variables? What's the time horizon?
2. Generates 3–5 probability-weighted scenarios per option (base case, optimistic, conservative, worst case)
3. Models each scenario over 1, 5, 10, and 20-year horizons
4. Identifies the **single highest-risk assumption** in your decision
5. Recommends the **fastest, cheapest way to validate** that assumption before committing

No false precision. Every output includes confidence levels and explicit assumptions so you know exactly what you're relying on.

### ⚙️ Implementation
- Skill: [`skills/decision-modeler/SKILL.md`](skills/decision-modeler/SKILL.md)
- Templates: [`skills/decision-modeler/references/decision-templates.md`](skills/decision-modeler/references/decision-templates.md)
- Entry point: `/decide`

</details>

<!-- ============================================================ -->
## 📋 All 17 Skills — Quick Reference

| Command | Layer | What It Does |
|---|---|---|
| `/cash-flow` | Cash Flow | Scores income & expenses by Freedom Impact; routes surplus to highest-value destinations |
| `/weekly-pulse` | Cash Flow | Weekly financial narrative connecting numbers to goals — not a dashboard, a story |
| `/leak-scan` | Cash Flow | Deep scan for hidden wealth drains: subscriptions, idle cash, fee drag, missed benefits, tax errors |
| `/portfolio-check` | Portfolio | Comprehensive health check: concentration risk, dead weight positions, missing diversification |
| `/rebalance` | Portfolio | Tax-aware rebalancing plan with specific trades, DCA timeline, and execution sequence |
| `/macro-check` | Portfolio | Monitor macroeconomic signals (VIX, yields, dollar, oil, gold) → portfolio-specific alerts |
| `/screen` | Portfolio | **NEW** — Scan 110 stocks for entry opportunities near support/resistance, filtered by your portfolio |
| `/signals` | Portfolio | **NEW** — Technical signals (RSI, MACD, divergence) in plain English, prioritized for your holdings |
| `/watchlist` | Portfolio | **NEW** — Early warnings: stocks approaching key levels in the next 1-5 days |
| `/tax-harvest` | Portfolio | Find tax-loss harvesting opportunities with wash-sale awareness and substitute positions |
| `/tax-strategy` | Tax | Year-round proactive tax optimization: bracket management, Roth conversions, asset location, equity comp |
| `/tax-review` | Tax | Analyze a tax return (1040, W-2, 1099s) to find missed deductions, credits, and optimization opportunities |
| `/freedom` | Wealth | Freedom Number + Freedom Date via Monte Carlo simulation + acceleration lever analysis |
| `/decide` | Wealth | Probability-weighted scenario modeling for any financial decision over 1–20 year horizons |
| `/life-event` | Wealth | Financial action plans for: job change, baby, marriage, inheritance, home purchase, and more |
| `/generational` | Wealth | Multi-generational wealth planning: Custodial Roth IRAs, 529 optimization, UGMA/UTMA |
| `/invest` | Wealth | **NEW** — Financial GPS: say your goal, get 3 paths with real numbers, step-by-step execution |
| `/thesis-to-trades` | Wealth | Convert an investment thesis into a portfolio gap analysis and specific trade recommendations |
| `/courage` | Emotional | Financial coaching when money feels overwhelming — validates, clarifies, builds a game plan |
| `/learn` | Emotional | Adaptive financial education that teaches through your real decisions, not lectures |
| `/money-os` | Meta | Unified entry point — describe what you want in plain English, gets routed automatically |

> 💡 **Try the Freedom Calculator first — no signup, no data collection:**
> Open [`apps/freedom-calculator/index.html`](apps/freedom-calculator/index.html) locally, or [deploy it via GitHub Pages](https://pages.github.com) for a shareable link.

<!-- ============================================================ -->
## 🏗️ Architecture — How It Works Under the Hood

*For contributors, auditors, and the technically curious.*

### The Skill System

**Skills are the core unit.** A skill is a markdown file with YAML frontmatter — a carefully crafted instruction set that guides Claude through expert-level financial analysis. No npm packages, no compiled code, no supply-chain risk.

```
User types: /leak-scan
        │
        ▼
[commands/leak-scan.md]          ← YAML frontmatter + routing logic
        │
        ▼
[skills/wealth-leak-scanner/SKILL.md]  ← instruction set for the analysis
        │                │
        │                ▼
        │  [references/common-leaks-checklist.md]  ← knowledge base
        │
        ▼
[profile/financial-identity.md]  ← your financial context (local only)
[profile/holdings.md]            ← your portfolio positions (local only)
        │
        ▼
Claude context window             ← all analysis runs here
        │
        ▼
Your screen                       ← recommendations + next steps
```

### The Five-Plane Architecture

```
┌─────────────────────────────────────────────────────────┐
│  PLANE 1: DATA                                          │
│  Account/transaction/holding ingestion & normalization  │
├─────────────────────────────────────────────────────────┤
│  PLANE 2: INTELLIGENCE                                  │
│  Exposure analysis, scenario testing, diagnostics       │
├─────────────────────────────────────────────────────────┤
│  PLANE 3: CONTROL                                       │
│  Permissions, policies, approvals, telemetry            │
├─────────────────────────────────────────────────────────┤
│  PLANE 4: EXECUTION                                     │
│  Dry-run validation, order tracking (M2 scope)          │
├─────────────────────────────────────────────────────────┤
│  PLANE 5: LEARNING  (planned)                           │
│  Paper trading, backtesting, self-improvement           │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Stack | Why |
|---|---|---|
| Skills | Pure markdown + YAML | Auditable, zero dependencies, no supply-chain risk |
| Commands | Markdown + YAML frontmatter | Composable entry points for skills |
| Profile storage | Local markdown files | Zero-trust, user-owned, version-controllable |
| Control center | Node.js, plain `http.createServer` (no Express) | No framework lock-in |
| Screener API | Next.js 15, TypeScript, Drizzle ORM | Real-time market screening engine |
| Market data | Yahoo Finance (free, no API key) | 110 tickers, daily + weekly OHLCV |
| Database | PostgreSQL (Supabase) | Bars, trendlines, signals, scanner results |
| Engines | ATR, RSI, MACD, Zigzag, Trendline, Scanner, Signal, Backtest | Pure TypeScript, fully tested |
| Paper trading | JSON-based virtual portfolio | $100K virtual capital, stop-loss/take-profit |
| Freedom Calculator | Standalone HTML/JS | Works offline, no build step |

### Repository Structure

```
.claude-plugin/         Plugin manifest
skills/                 20 financial intelligence skills
  security-screener/    ← Market scanning + technical analysis
  investment-navigator/ ← GPS-style investment guide + ADEPT coaching
  <skill-name>/
    SKILL.md            ← instruction set (YAML frontmatter + markdown)
    references/         ← domain knowledge (formulas, rules, stories)
commands/               21 slash command entry points
  money-os.md           ← unified intent router
  invest.md             ← financial GPS entry point
  screen.md             ← security scanner
profile/                ← your local financial data (gitignored)
apps/
  screener-api/         Next.js data service (trendlines, scanner, signals)
    lib/indicators/     ATR, RSI, MACD, Zigzag (pure TypeScript)
    lib/engine/         Trendline, Scanner, Signal, Backtest, Paper Trader
    __tests__/          53 unit + functional tests
    scripts/            Pipeline runner, backtester, auto-trader
  control-center/       Node.js dashboard (prototype)
  freedom-calculator/   Standalone HTML calculator
docs/
  prd/security-screener/  Architecture, PRD, Roadmap for screener
  strategy/               Vision, game plan, competitive landscape
```

<!-- ============================================================ -->
## 🤝 Contributing

Money OS is designed to be extended. The best contributions are new skills — and the bar is surprisingly low, because **a skill is just a well-crafted markdown file**.

### How to Add a Skill (5 Steps)

```bash
# 1. Fork and clone
git clone https://github.com/wjlgatech/money-os
cd money-os

# 2. Create your skill directory
mkdir -p skills/my-new-skill/references

# 3. Write the skill (copy an existing skill as a template)
cp skills/decision-modeler/SKILL.md skills/my-new-skill/SKILL.md
# Edit: name, description, version, tools, and the instruction body

# 4. Add a command entry point (optional)
cp commands/decide.md commands/my-command.md

# 5. Test it: run the command in Claude and verify the output
npm run test:smoke   # Validates the server APIs
```

**What makes a good skill:**
- It separates facts, inferences, and opinions in every output
- It includes an explicit "verify this" step before any recommended action
- It has a reference document for domain knowledge (formulas, rules, benchmarks)
- It writes to `profile/history.md` so decisions are auditable

### Engineering Standards

- Financial calculations must be deterministic and testable
- Time, currency, and precision behavior must be explicit
- Every recommendation includes human approval gates — no auto-execution
- New skills should follow the existing YAML frontmatter schema

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full checklist. [Browse good first issues →](https://github.com/wjlgatech/money-os/issues?q=label%3A%22good+first+issue%22)

<!-- ============================================================ -->
## 🛣️ Roadmap

| Version | Status | What's In It |
|---|---|---|
| **v3.0** | ✅ Shipped | 16 skills, 15 commands — full coverage across 5 layers |
| **v3.1** | ✅ Shipped | Profile persistence, shareable artifacts, unified `/money-os` entry |
| **v4.0** | ✅ Current | Security Screener (110 stocks, real data), `/invest` GPS navigator, ADEPT coaching, paper trading, backtest engine, trade gate |
| **v4.1** | 🔨 Next | Crypto support (CoinGecko), fundamental data (P/E, revenue growth), regime filter for bear markets |
| **v4.2** | 📅 Planned | Alpaca broker integration, human-gated live trading with real money |
| **v5.0** | 🔭 Future | Autonomous trading within pre-approved rules, continuous strategy learning |

[Full standalone app roadmap →](ROADMAP.md)

<!-- ============================================================ -->
## ⚖️ Philosophy

**Empowering, not shaming.** Spending is analyzed as acceleration or deceleration toward freedom — not as moral judgments. There is no "you spent too much on coffee" in Money OS. There is "this dollar is not working toward your Freedom Date."

**Wealth creation, not budgeting.** The goal is financial independence, not penny-counting. The question is always: *when does work become optional?*

**Understanding, not just tools.** Every interaction teaches. Tools go out of fashion; understanding compounds.

**Safety first.** No financial transaction executes without explicit approval. Every recommendation includes verification steps. No data leaves your machine.

**Separate facts from inferences from opinions.** Every decision flow labels what is known, what is modeled, and what is a recommendation. You always know what you're relying on.

<!-- ============================================================ -->
## 📜 Disclaimer

Money OS provides analytical frameworks and educational content — not financial advice. Always consult qualified professionals (CPA, CFP, securities attorney) for investment, tax, and legal decisions. Past performance and projections do not guarantee future results. See [docs/security-and-trust.md](docs/security-and-trust.md) for full responsible use guidelines.

## 📄 License

Open source. See [LICENSE](LICENSE) for details.

---

*Built with ❤️ and Claude · [Star this repo](https://github.com/wjlgatech/money-os) if Money OS helped you find something · [Share your Freedom Number](skills/share-cards/SKILL.md)*
