---
name: thesis-to-trades
description: >
  Convert an investment thesis or framework into a gap analysis against current holdings, producing
  specific trade recommendations to align the portfolio with the thesis. Use when the user says
  "apply this framework to my portfolio", "what am I missing from this thesis", "align my portfolio
  with", "investment framework", "thesis to trades", "map my holdings to this strategy", or shares
  an investment thesis and asks how their portfolio compares.
version: 0.1.0
---

# Thesis-to-Trades Converter

Bridge the gap between investment ideas and portfolio action. Take an investment thesis, framework, or strategy document and convert it into a concrete gap analysis with specific trades.

## Process

### Step 1: Parse the Thesis

Extract from the user's thesis/framework:
- **Layers/Categories**: What are the investment categories? (e.g., AI chips, energy, defense)
- **Specific tickers**: Any named companies or ETFs
- **Allocation guidance**: Suggested percentages per category
- **Time horizon**: How long is the thesis expected to play out?
- **Risk factors**: What could invalidate the thesis?
- **Conviction levels**: Which bets are highest conviction?

Structure the thesis as a table:
```
| Category | Target % | Key Tickers | Conviction | Time Horizon |
```

### Step 2: Map Current Holdings

For each position in the portfolio, assign it to a thesis category:
- **Aligned**: Position directly maps to a thesis category
- **Adjacent**: Position is related but not a primary thesis pick
- **Unaligned**: Position has no thesis support
- **Contradictory**: Position bets against the thesis

### Step 3: Gap Analysis

For each thesis category, calculate:
- **Current exposure**: Sum of aligned + adjacent positions
- **Target exposure**: Based on thesis allocation guidance
- **Gap**: Dollar amount under/over-allocated
- **Coverage quality**: Are you holding the RIGHT tickers, or just the right category?

Flag:
- Categories with 0% exposure (complete gaps)
- Categories where you hold adjacent but not primary picks
- Categories where you're significantly over-allocated vs thesis

### Step 4: Generate Trade Plan

Produce specific trades to close gaps:

For OVER-allocated categories:
- Which specific positions to trim
- How many shares to sell
- Use proceeds to fund under-allocated categories

For UNDER-allocated categories:
- Which specific tickers to buy (from thesis)
- Dollar amount per position
- Priority order (largest gaps first)

For UNALIGNED positions:
- Evaluate if they serve a purpose outside the thesis (diversification, hedge)
- If not, recommend selling and redeploying

### Step 5: Sanity Check

Before presenting the plan, verify:
- Does the plan maintain adequate diversification?
- Are we concentrating too heavily based on one person's thesis?
- What happens to the portfolio if the thesis is WRONG?
- Are there contrarian positions worth keeping as hedges?

Always include a "What if the thesis is wrong?" section with specific risks.

## Output Format

```
THESIS ALIGNMENT REPORT

Thesis: [Name/Source]
Portfolio: $XXX,XXX across X accounts

ALIGNMENT SCORE: X/10

CATEGORY BREAKDOWN:
| Category | Thesis Target | Current | Gap | Action |

MISSING EXPOSURES (highest priority):
- [Category]: $X,XXX needed → Buy [Ticker] at $X,XXX

OVER-EXPOSURES:
- [Category]: $X,XXX over → Trim [Ticker] by X shares

UNALIGNED POSITIONS:
- [Ticker]: $X,XXX — no thesis support → [Sell / Keep as hedge]

TRADE SEQUENCE:
[Ordered list of specific trades]

THESIS RISK FACTORS:
- If [assumption] is wrong: [impact on portfolio]
```

## Important Notes

- No single thesis should dictate 100% of a portfolio. Always maintain some diversification beyond the thesis.
- Flag if the thesis is from a single source (YouTube, newsletter, influencer) — concentration of information sources is as dangerous as concentration of positions.
- Investment theses have shelf lives. Note when the thesis should be re-evaluated.
