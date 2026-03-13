---
name: freedom-number
description: >
  Calculate your personal Freedom Number (the passive income level where work becomes optional),
  track progress toward it, model scenarios, and run Monte Carlo simulations on YOUR specific path.
  Use when the user says "freedom number", "when can I retire", "financial independence",
  "FIRE", "retire early", "how much do I need to retire", "passive income goal",
  "when is work optional", "how close am I to freedom", "retirement calculator",
  "what's my number", or asks about any long-term financial independence goal.
version: 0.1.0
---

# Freedom Number Engine

Calculate, track, and model the user's path to financial independence — where passive income exceeds expenses and work becomes a choice, not a requirement.

## Core Concept

The Freedom Number is NOT a net worth target. It's a **monthly passive income target** that covers living expenses without working. This is more actionable than a lump sum because it connects to daily reality.

```
Freedom Number = Monthly Essential Expenses × Safety Multiplier
Freedom Portfolio = Freedom Number × 12 / Safe Withdrawal Rate
```

## Required Input

### Minimum (can start with just this):
- Monthly essential expenses (or total monthly spending)
- Current investment portfolio value
- Monthly savings/investment amount

### Enhanced (for detailed modeling):
- Expense breakdown (essential vs. discretionary)
- All account balances (taxable, IRA, Roth, 401k, HSA)
- Current income and expected trajectory
- Age and target freedom age
- Expected Social Security (if applicable)
- Pension or other guaranteed income
- Existing passive income (dividends, rental, etc.)

## Calculation Framework

### Step 1: Define the Freedom Number

Read `references/freedom-math.md` for detailed formulas.

Three tiers of freedom:
1. **Lean Freedom**: Essential expenses only (housing, food, insurance, utilities)
   - Safety multiplier: 1.0×
2. **Comfortable Freedom**: Essentials + moderate discretionary
   - Safety multiplier: 1.3×
3. **Rich Freedom**: Full current lifestyle + travel/luxury buffer
   - Safety multiplier: 1.6×

Present all three. Let the user choose their target.

### Step 2: Current Passive Income Inventory

Calculate existing passive income streams:
- Dividend income (current yield × portfolio value in dividend-paying holdings)
- Interest income (HYSA, bonds, CDs)
- Rental income (if any)
- Other passive sources

```
Current Passive Income: $X,XXX/mo
Freedom Number: $X,XXX/mo
Freedom Progress: XX.X%
```

### Step 3: Gap Analysis

```
Monthly Gap = Freedom Number - Current Passive Income
Portfolio Gap = (Monthly Gap × 12) / SWR - Current Portfolio
Time to Freedom = years until gap closes at current savings rate
```

### Step 4: Scenario Modeling

Model at least 4 scenarios:
1. **Base Case**: Current trajectory, no changes
2. **Optimized**: Max all tax-advantaged accounts + implement tax alpha
3. **Accelerated**: Optimized + increase savings rate by 10%
4. **Dream**: What if income increases 20% OR side income added?

For each scenario, show:
- Years to freedom
- Monthly actions required
- Key assumptions

### Step 5: Monte Carlo Simulation

Run 10,000 simulated paths using:
- Historical return distribution (mean 10%, std 18% for equities)
- Inflation uncertainty (2-5% range)
- Income growth uncertainty
- Sequence-of-returns risk
- Longevity risk (plan to age 95)

Report:
```
MONTE CARLO RESULTS (10,000 simulations)
Probability of freedom by target age:
  95th percentile: Age XX (best case)
  75th percentile: Age XX (likely optimistic)
  50th percentile: Age XX (median)
  25th percentile: Age XX (likely pessimistic)
  5th percentile:  Age XX (worst case)

Success rate at target age: XX%
```

### Step 6: Acceleration Levers

Rank the top actions by impact on freedom date:
1. "Max Roth IRA ($7K/yr) → moves freedom X months closer"
2. "Mega Backdoor Roth ($36.5K/yr) → moves freedom X years closer"
3. "Implement tax alpha (~$3K/yr reinvested) → moves freedom X months closer"
4. "Increase savings rate by 5% → moves freedom X months closer"
5. "Negotiate $15K raise → moves freedom X months closer"

## Output Format

```
YOUR FREEDOM DASHBOARD
═══════════════════════
Freedom Number (Comfortable): $X,XXX/month
Current Passive Income: $X,XXX/month
Freedom Progress: ████████░░░░░░░░ XX.X%

FREEDOM TIMELINE
Base case:      XX years (age XX)
Optimized:      XX years (age XX) ← recommended
Accelerated:    XX years (age XX)

MONTE CARLO: XX% probability of freedom by age XX

TOP 3 ACCELERATION LEVERS
1. [Action] — saves [X months/years]
2. [Action] — saves [X months/years]
3. [Action] — saves [X months/years]

NEXT MILESTONE: $X,XXX/month passive income (XX% of freedom)
```

Always chain: "Want me to set up a weekly pulse to track your freedom progress? Or model a specific scenario?"

## Important Notes

- Freedom ≠ retirement. Frame it as "work becomes optional" not "stop working"
- Always show the compound effect of small changes
- Social Security is a bonus, not a plan — model with and without it
- Disclaimer: "This is analytical modeling, not financial advice. Actual results will vary."
- For users under 40, emphasize Roth accounts (decades of tax-free growth)
- For users over 50, include catch-up contribution limits
