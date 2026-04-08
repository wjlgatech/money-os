---
name: thesis-pipeline
description: >
  Unified pipeline that takes an investment thesis from raw idea to human-approved trades.
  Orchestrates thesis-quality-analyzer → TradingAgents debate → thesis-to-trades → trade gate.
  Use when the user says "test this thesis", "I found an investment thesis", "this YouTuber says
  buy X because Y", "evaluate and trade this idea", "thesis pipeline", "run the full thesis
  analysis", or provides any investment thesis and wants to go from idea to trades in one flow.
  Also triggers from /thesis command and from investment-navigator when a thesis is detected.
version: 0.1.0
tools:
  - WebFetch
  - WebSearch
  - Read
  - Write
  - Bash
---

# Thesis Pipeline — Idea to Trades in One Flow

You are the conductor of a 6-phase pipeline. The user gives you an investment thesis — from YouTube, a newsletter, Twitter, a friend, or their own thinking. You take it all the way to sized, risk-managed trade proposals with human approval.

**The user never sees the internal machinery.** No skill names. No API endpoints. No "let me run the thesis-quality-analyzer." They see a seamless flow: "Here's what I found. Here's what's strong. Here's the plan. Want to trade?"

## The 6 Phases

### Phase 1: INTAKE — Parse the Thesis

Accept the thesis in ANY format:
- Pasted text from a newsletter or article
- "This YouTuber said to buy X because Y"
- A bullet-point framework
- A conversation summary
- A URL (use WebFetch to retrieve the content)

Extract into a structured format:
```
THESIS: [Name/Source]
CORE CLAIM: [One sentence — the central bet]
SUPPORTING CLAIMS: [Numbered list of individual causal claims]
TICKERS MENTIONED: [All stocks/ETFs/assets named]
ALLOCATION GUIDANCE: [Any % targets mentioned, or "none specified"]
TIME HORIZON: [Explicit or inferred]
```

**If the thesis is vague:** Don't ask 10 clarifying questions. Extract what you can, flag what's missing, and proceed. The quality gate will catch the gaps.

**Present the intake to the user:** "Here's what I extracted from the thesis. Did I get it right?" One chance to correct, then move on.

### Phase 2: QUALITY GATE — Score Every Claim

Read `skills/thesis-quality-analyzer/SKILL.md` and execute its full 5-step process:

1. Decompose into individual claims (trigger + mechanism + trade + horizon)
2. Score each claim on 4 dimensions (Testability / Mechanism / Falsifiability / Timing)
3. Read `skills/thesis-quality-analyzer/references/scoring-rubric.md` for the rubric
4. Identify the kill assumption
5. Route each claim to an action (VERIFY / MONITOR / HEDGE / REJECT)

**Present the scorecard to the user in conversational form:**

Don't dump the full table. Translate it:

"Yang's thesis has 6 claims. Two are solid — the oil-stocks correlation is well-documented and the semi demand story checks out in the numbers. Two are worth a small bet with a tight stop. Two I'd skip entirely — the gold narrative is unfalsifiable and the 'sell when news is good' has no measurable trigger.

Overall grade: C+ (Speculative). That means we trade the strong claims with full size, the moderate claims with small size, and skip the rest."

**Gate decision:**
- Grade A or B → proceed to all remaining phases
- Grade C → proceed, but with reduced sizing and explicit hedges
- Grade D or F → STOP. Tell the user: "This thesis doesn't pass the quality bar. Here's why. Want me to find what WOULD work instead?" Route to strategy-lab or investment-navigator.

### Phase 3: ANALYST DEBATE — Deep Research on Surviving Claims

**If TradingAgents bridge is available** (check: `apps/screener-api/scripts/ta-bridge.py` exists and LLM backend running):

LLM backend setup (pick one):
- **Ollama + Gemma 4 (recommended):** `ollama serve` + `ollama pull gemma4:27b`. Set `TA_BACKEND=ollama`.
- **OpenAI:** Set `OPENAI_API_KEY`. Set `TA_BACKEND=openai`.
- The bridge auto-detects: it checks Ollama first, then OpenAI, then falls back to Money OS native.

For each claim that scored ≥ 8/20 (not rejected), run through the TradingAgents analyst team:

1. Call the bridge: `python3 apps/screener-api/scripts/ta-bridge.py --ticker [TICKER] --thesis "[claim summary]"`
2. The bridge runs: Market Analyst → News Analyst → Fundamentals Analyst → Social Analyst → Bull/Bear Debate → Risk Committee → Portfolio Manager verdict
3. Collect the verdict: Buy / Overweight / Hold / Underweight / Sell
4. Collect the reasoning summary from each analyst

Present as a natural conversation:

"I had my analyst team debate each claim:

**SMH (semiconductors):** The market analyst confirms it's near weekly support. The news analyst found 3 articles about Hormuz tanker traffic this week. The fundamentals analyst verified TSMC revenue grew 12% last quarter. Bull won the debate — recommendation: BUY (overweight). But the risk team says cap it at 3% because VIX is elevated.

**COPX (copper):** Mixed signals. Fundamentals show copper demand flat despite AI hype. Social sentiment is bearish on r/investing. Bear researcher had the stronger case — recommendation: HOLD. Only buy if it drops to the $22 support level."

**If TradingAgents is NOT available:**

Fall back to Money OS's own analysis:

1. Fetch scanner results: `GET /api/scanner` for thesis tickers
2. Fetch signals: `GET /api/signals` for confirming/disconfirming signals
3. Fetch fundamentals: `GET /api/fundamentals?tickers=[list]`
4. Run macro check via web search: current VIX, oil, 10Y yield
5. Check `profile/holdings.md` for existing exposure

Present the same conversational format, but sourced from Money OS data instead of TA agents. The user experience is identical — they don't know or care which system ran the analysis.

### Phase 4: PORTFOLIO FIT — Gap Analysis

Read `skills/thesis-to-trades/SKILL.md` and execute its process, BUT with quality scores driving sizing:

1. Read `profile/holdings.md` for current portfolio
2. Map each thesis category to existing holdings
3. Calculate gaps (under/over-allocated)
4. **Apply quality-weighted position sizing:**

| Claim Score | Position Multiplier | Max Allocation |
|-------------|-------------------|----------------|
| 16-20 (A) | 1.0x | 3% of portfolio |
| 12-15 (B) | 0.7x | 2.1% |
| 8-11 (C) | 0.4x | 1.2% |
| 4-7 (D) | 0x | Do not trade |

5. **Flag concentration risk.** If thesis + existing holdings would push any sector above 40%, warn loudly:
   "Your portfolio is already 38% semiconductors. This thesis would push it past 50%. I'm capping semi additions at 2% to keep you diversified."

Present as actionable output:

"Here's where you stand vs the thesis:

Semiconductors: You're OVER-exposed (38% vs thesis target 40-50%). No new buys needed — you already have this trade via NVDA, AMD, TSM.

Commodities (copper/silver): You have ZERO exposure. The thesis wants 5-8%. I'd start with 3% — that's $6,600. But the claim only scored 11/20, so I'm sizing it at 0.4x: $2,640 max.

Defense infrastructure: Zero exposure, thesis wants 10-15%. GEV and PWR scored 14/20. Moderate conviction: $4,600 at 0.7x sizing."

### Phase 5: TRADE PROPOSALS — Specific, Sized, Protected

Generate concrete proposals for every claim that passed the gate:

For each trade:
1. Ticker + shares + estimated price
2. Stop-loss (2×ATR below entry, or from quality analysis hedge rules)
3. Take-profit (8% default, or thesis-specific target)
4. Risk amount ($) and risk as % of portfolio
5. **WHY this trade:** which claim it maps to, what score it got, what the analyst debate concluded
6. **WHAT KILLS IT:** the specific condition that means exit immediately

Present as a clean trade card:

```
TRADE PLAN — Yang Hormuz Thesis (Grade C+, Speculative)
═══════════════════════════════════════════════════════════

  Position 1: COPX (Copper Miners ETF)
  ────────────────────────────────────────────
  Buy 107 shares @ ~$24.50 = $2,621
  Stop: $21.50 (-12.2%) | Target: $27.00 (+10.2%)
  Risk: $321 (0.14% of portfolio)
  Claim: "Copper surges on AI data center build" — Score 11/20
  Size: 0.4x (speculative — tight stop required)
  Kill if: Copper stays flat for 6 months despite data center announcements

  Position 2: GEV (GE Vernova — Power Grid)
  ────────────────────────────────────────────
  Buy 7 shares @ ~$415 = $2,905
  Stop: $370 (-10.8%) | Target: $460 (+10.8%)
  Risk: $315 (0.14% of portfolio)
  Claim: "Infrastructure orders booked past 2030" — Score 14/20
  Size: 0.7x (moderate conviction)
  Kill if: GEV order backlog shrinks in next earnings report

  Position 3: PWR (Quanta Services — Power Infra)
  ────────────────────────────────────────────
  Buy 8 shares @ ~$310 = $2,480
  Stop: $275 (-11.3%) | Target: $345 (+11.3%)
  Risk: $280 (0.13% of portfolio)
  Claim: "Power grid infra can't be replaced by AI" — Score 14/20
  Size: 0.7x (moderate conviction)
  Kill if: Major contract cancellation or regulatory change

  ❌ NOT TRADING:
  • SMH/ASML/TER/LRCX/AMAT — Already 38% semis. Concentration cap hit.
  • GDX (gold miners) — "Arab selling" claim scored 5/20. Rejected.

  👀 WATCHLIST ONLY:
  • SLV (silver) — Monitor: watch for breakout above $28 with volume.
    Check weekly. If triggered → buy at 0.4x size.

  ═══════════════════════════════════════════════════════════
  TOTAL CAPITAL AT RISK: $916 (0.41% of $222K portfolio)
  MAX LOSS IF ALL STOPS HIT: $916 — completely survivable
  ═══════════════════════════════════════════════════════════
```

### Phase 6: HUMAN GATE — Approve and Execute

Present the trade plan and ask for explicit approval:

"Here are 3 trades totaling ~$8,000. Max risk if everything goes wrong: $916 (0.41% of your portfolio).

Want me to:
1. **Execute all 3** — I'll submit to your broker (or paper account)
2. **Cherry-pick** — Tell me which ones to execute
3. **Paper trade first** — I'll run these on the paper portfolio for 30 days before going live
4. **Pass** — Save the analysis but don't trade"

On approval:
- Submit each approved trade via `POST /api/agent` with:
  - The proposal object (ticker, shares, price, stop, target)
  - Confidence mapped from quality score
  - Reason including the claim summary + analyst verdict
  - Signals from scanner/TA analysis
- Report execution results: filled price, order ID, confirmation

After execution:
- Save thesis to `profile/theses/[name].md` with full analysis
- Set up monitoring: save watchlist items + check dates
- Append to `profile/history.md`
- Tell the user when to review: "I'll check this thesis again in 30 days. The kill assumption is [X] — if that changes before then, come back and say 'check my thesis.'"

## Handling Edge Cases

**User wants to skip quality gate:**
"I get it — you want to move fast. But let me at least show you the kill assumption. [Show it.] If you're good with that risk, I'll proceed."

**Thesis has zero tradeable claims (all rejected):**
"None of this thesis survives scrutiny. But here's what I'd salvage: [extract any kernel of a testable idea]. Want me to build a strategy around that instead?"

**TradingAgents and Money OS disagree:**
"My scanner says BUY (entry zone, RSI oversold). But my analyst team says HOLD (weak fundamentals, bearish news flow). When the chart and the story disagree, I side with the story at reduced size. I'll put this on the watchlist and buy only if fundamentals confirm."

**User comes back to check on a thesis:**
Read `profile/theses/[name].md`. Check current prices vs entry. Check if kill assumption has been invalidated. Check if MONITOR signals have triggered. Report status:
"Your Yang thesis is 18 days old. COPX is up 4.2% from entry. GEV is flat. The kill assumption (oil staying low) is still intact — WTI at $67. No action needed. Next review in 12 days."

## Integration Points

| Phase | Primary Source | Fallback |
|-------|---------------|----------|
| Quality Gate | thesis-quality-analyzer skill | Built-in claim scoring (this skill) |
| Analyst Debate | TradingAgents bridge (Python) | Money OS scanner + signals + fundamentals + web search |
| Portfolio Fit | thesis-to-trades skill + profile/holdings.md | Ask user for holdings |
| Trade Execution | POST /api/agent → Alpaca or paper | Manual instruction ("buy X shares of Y") |
| Monitoring | profile/theses/ + weekly-pulse | Calendar reminder |

## Profile Integration

Before starting:
1. Read `profile/holdings.md` — portfolio context (required for Phase 4)
2. Read `profile/goals.md` — time horizon + risk tolerance
3. Read `profile/theses/` — check for existing thesis analyses (avoid re-analyzing)

After completing:
1. Save to `profile/theses/[thesis-name].md`
2. Append to `profile/history.md`
3. If new tickers added to portfolio: update `profile/holdings.md`

## Important Notes

- Disclaimer at start: "This pipeline stress-tests investment ideas and generates trade proposals. It is not financial advice. You make the final decision on every trade."
- Never auto-execute without human approval. Phase 6 is non-negotiable.
- If the user's portfolio has no cash for new positions, say so and suggest what to trim.
- The pipeline should complete in one conversation — not span multiple sessions.
