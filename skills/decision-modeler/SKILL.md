---
name: decision-modeler
description: >
  Model any major financial decision with 3-5 probability-weighted scenarios over 1, 5, 10, and 20
  years using YOUR tax bracket, portfolio, and goals. Use when the user says "should I",
  "what if I", "compare options", "model this decision", "which is better", "decide between",
  "rent vs buy", "sell vs hold", "Roth conversion worth it", "refinance analysis",
  "lease vs buy", "stay vs switch jobs", or faces any binary/multi-option financial choice.
version: 0.1.0
---

# Decision Modeler

Transform any financial decision from gut feel into a data-driven analysis with probability-weighted scenarios.

## Core Philosophy

Most financial decisions are made on intuition or anxiety. The Decision Modeler provides strategic confidence by showing the expected value of each option under multiple scenarios, personalized to the user's actual tax bracket, time horizon, and risk tolerance.

## Required Input

- The decision being considered (as clearly framed as possible)
- User's current financial state (income, bracket, portfolio, goals)
- Time horizon for the decision
- Key variables that affect the outcome
- User's risk tolerance (if not previously established)

## Modeling Framework

### Step 1: Frame the Decision

Clarify the decision into distinct options. Most decisions are:
- **Binary**: A vs B (sell vs hold, rent vs buy, Roth convert vs don't)
- **Multi-option**: A vs B vs C (job offers, investment choices)
- **Timing**: Now vs later vs never

Explicitly state what each option means in financial terms.

### Step 2: Identify Key Variables

For each decision, identify the 3-5 variables that most affect the outcome:
- Market returns (use distributions, not single numbers)
- Tax rates (current and projected)
- Inflation
- Income trajectory
- Interest rates
- Specific asset performance

### Step 3: Build Scenarios

Create 3-5 scenarios with assigned probabilities:

| Scenario | Probability | Key Assumptions |
|----------|------------|-----------------|
| Bull case | 15-20% | Best plausible outcome |
| Optimistic | 25-30% | Above-average but realistic |
| Base case | 30-40% | Most likely |
| Pessimistic | 15-20% | Below-average but realistic |
| Bear case | 5-10% | Worst plausible outcome |

Probabilities must sum to 100%.

### Step 4: Calculate Expected Value

For each option under each scenario, calculate the financial outcome at 1, 5, 10, and 20 years.

Include:
- Direct financial return/cost
- Tax implications (at user's specific bracket)
- Opportunity cost (what the alternative would have earned)
- Risk-adjusted value (downside-weighted)
- Non-financial factors (stress, flexibility, optionality)

```
Expected Value = Σ (Probability_i × Outcome_i) for all scenarios
Risk-Adjusted Value = Expected Value - (Downside Risk × Risk Penalty)
```

### Step 5: Sensitivity Analysis

Identify which variable matters most. Show:
"If [variable] changes by ±X%, the decision flips from Option A to Option B."

This reveals whether the decision is robust or fragile.

### Step 6: Recommendation

Based on the analysis:
1. State which option has the highest expected value
2. State which option has the lowest downside risk
3. State which option is most robust to assumption changes
4. Make a recommendation that balances all three

## Common Decision Templates

Read `references/decision-templates.md` for pre-built models of common decisions.

## Output Format

```
DECISION MODEL: [Decision Title]
═══════════════════════════════════

OPTIONS:
  A: [Description]
  B: [Description]
  C: [Description] (if applicable)

KEY VARIABLES:
  1. [Variable] — Range: [low] to [high]
  2. [Variable] — Range: [low] to [high]
  3. [Variable] — Range: [low] to [high]

SCENARIO ANALYSIS:
┌─────────────┬───────┬──────────────┬──────────────┐
│ Scenario     │ Prob  │ Option A     │ Option B     │
├─────────────┼───────┼──────────────┼──────────────┤
│ Bull case   │  15%  │ $+XX,XXX     │ $+XX,XXX     │
│ Base case   │  50%  │ $+XX,XXX     │ $+XX,XXX     │
│ Bear case   │  35%  │ $-X,XXX      │ $+X,XXX      │
├─────────────┼───────┼──────────────┼──────────────┤
│ Expected Val│       │ $+XX,XXX     │ $+XX,XXX     │
└─────────────┴───────┴──────────────┴──────────────┘

10-YEAR PROJECTION:
  Option A: $XXX,XXX (range: $XX,XXX to $XXX,XXX)
  Option B: $XXX,XXX (range: $XX,XXX to $XXX,XXX)

SENSITIVITY: Decision flips if [variable] exceeds [threshold]

VERDICT:
  Highest expected value: Option [X]
  Lowest downside risk: Option [X]
  Most robust: Option [X]
  ★ RECOMMENDATION: Option [X] because [1-2 sentence rationale]

WHAT WOULD CHANGE THIS RECOMMENDATION:
  - If [condition], then Option [Y] becomes better
  - If [condition], reconsider in [timeframe]

EXECUTE THE PLAN:
  → [Relevant skill chain based on decision type]
  → Run /tax-strategy to model tax impact
  → Run /weekly-pulse to track progress toward this decision's targets
```

## Skill Chaining Rules

After recommendation, always suggest the next skill to execute:
- Roth conversion decision → chain to tax-strategy
- Rent vs Buy → chain to cash-flow-intel (can you afford it?)
- Sell vs Hold stock → chain to tax-harvest or rebalancing-plan
- Job change → chain to life-event-router
- Lump sum vs DCA → chain to rebalancing-plan for execution
- Refinance → chain to cash-flow-intel (new payment routing)

## Important Notes

- Always show the math, not just the conclusion
- Quantify opportunity cost explicitly
- Include non-financial factors (stress, flexibility, reversibility)
- For irreversible decisions, weight downside risk more heavily
- Disclaimer: "This is analytical modeling, not financial advice."
- If the decision is clearly one-sided, say so directly — don't manufacture false balance
