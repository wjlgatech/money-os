---
name: tax-strategy
description: >
  Year-round proactive tax strategy that connects portfolio decisions to tax consequences
  BEFORE you act. Use when the user says "tax strategy", "tax planning", "how to reduce my
  taxes", "tax optimization", "should I do a Roth conversion", "backdoor Roth", "mega backdoor
  Roth", "RSU tax strategy", "stock option taxes", "capital gains planning", "tax-efficient
  investing", "asset location", "which account should I use", "estimated taxes", "tax bracket
  management", "how much tax will I owe", "year-end tax planning", or asks about tax
  implications of any investment decision.
version: 0.1.0
---

# Tax Strategy Engine

Year-round, portfolio-aware tax intelligence. This skill does NOT file taxes — it provides
proactive strategy to minimize lifetime tax burden through smart sequencing of investment
decisions, account selection, and income timing.

## What TurboTax Cannot Do (Our 10x Advantage)

TurboTax is a form-filler. It asks "what happened?" and fills in boxes.
This skill asks "what SHOULD happen?" and tells you the optimal sequence.

Key differentiators:
- Portfolio-aware: knows your holdings, gains, losses, and account types
- Forward-looking: models tax impact of proposed trades BEFORE execution
- Multi-year: optimizes across years, not just current filing
- Strategy-first: starts with goals (minimize tax, maximize Roth, defer gains) then works backward to specific actions

## Core Capabilities

### 1. Tax Bracket Management

Read `references/bracket-optimization.md` for current brackets and strategies.

Analyze the user's income situation and identify:
- Current marginal bracket and distance to next bracket
- Opportunities to "fill up" lower brackets (Roth conversions, capital gains harvesting)
- Income spikes to manage (RSU vesting, bonus, stock sales)
- Strategies to smooth income across years

### 2. Account Placement Optimization (Asset Location)

Read `references/asset-location.md` for the decision framework.

Determine optimal placement of each asset across account types:
- Taxable brokerage: tax-efficient assets (index funds, growth stocks held long-term, municipal bonds)
- Roth IRA: highest-expected-growth assets (tax-free gains forever)
- Traditional IRA / 401k: income-generating assets (bonds, REITs, dividend stocks)
- HSA (if eligible): maximum growth assets (triple tax advantage)

### 3. Roth Conversion Strategy

Evaluate whether and how much to convert from Traditional IRA → Roth IRA:
- Calculate the "Roth conversion sweet spot": income level where conversion fills current bracket
- Model the break-even horizon (how many years until Roth beats Traditional)
- Factor in: current bracket, expected future bracket, RMD age, estate planning goals
- Mega Backdoor Roth: check employer plan eligibility, calculate maximum contribution

### 4. Investment Decision Tax Modeling

Before ANY sell/buy decision, model the tax consequence:
- Short-term vs long-term capital gains impact
- Net Investment Income Tax (NIIT) threshold: $200k single / $250k married
- Alternative Minimum Tax (AMT) exposure (especially for ISO exercises)
- State tax implications
- Wash sale rule compliance
- Estimated quarterly tax payment adjustments needed

### 5. RSU / Stock Option Strategy

Read `references/equity-comp-tax.md` for detailed strategies.

For tech workers with equity compensation:
- RSU vesting tax modeling (ordinary income on vest date)
- ISO vs NSO exercise strategy
- AMT planning for ISO exercises
- 83(b) election analysis for early-stage startups
- Diversification strategy that minimizes tax friction
- Donor Advised Fund (DAF) strategy for appreciated stock

### 6. Advanced Strategies

Read `references/advanced-strategies.md` for detailed guidance.

Surface strategies most people miss:
- Qualified Small Business Stock (Section 1202): up to $15M gain exclusion
- Qualified Opportunity Zone (QOZ) investments: capital gains deferral
- Charitable giving of appreciated stock to DAFs
- Harvesting gains at 0% rate (if in low bracket)
- Tax-gain harvesting (yes, sometimes realizing gains is optimal)
- Net unrealized appreciation (NUA) for company stock in 401k
- Series I Bond tax deferral strategies

### 7. Year-End Tax Checklist

Generate a personalized year-end tax action list:
- Remaining Roth conversion space
- Tax-loss harvesting sweep
- Charitable giving deadline (Dec 31)
- 401k/IRA contribution deadline check
- Estimated tax payment review
- Flexible spending account use-or-lose deadline
- RMD compliance (if age 73+)

## Process

1. **Gather tax profile**: filing status, income sources, marginal bracket, state
2. **Connect to portfolio**: use holdings data from portfolio-health-check or user input
3. **Identify opportunities**: run all 7 capability checks
4. **Rank by impact**: sort by estimated dollar savings
5. **Generate action plan**: specific, sequenced, deadline-aware actions

## Output Format

```
TAX STRATEGY REPORT — [Year]

ESTIMATED CURRENT TAX LIABILITY: $XX,XXX
POTENTIAL SAVINGS IDENTIFIED: $X,XXX — $XX,XXX

IMMEDIATE ACTIONS (do this week):
1. [Action] — saves ~$X,XXX — [deadline if applicable]

THIS QUARTER:
2. [Action] — saves ~$X,XXX

YEAR-END:
3. [Action] — saves ~$X,XXX

MULTI-YEAR PLANNING:
4. [Action] — saves ~$XX,XXX over X years

DETAILED ANALYSIS:
[Section for each strategy with full reasoning]
```

## Critical Disclaimers

- This is tax education and analytical modeling, NOT tax advice
- Tax situations are highly individual — always verify with a CPA or tax attorney
- Tax laws change frequently — verify current rules before acting
- State tax rules vary significantly and may override federal strategies
- For portfolios >$500k or income >$250k, professional tax planning is strongly recommended
