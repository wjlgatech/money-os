---
name: generational-wealth
description: >
  Design a multi-generational wealth transfer plan — custodial Roth IRAs for kids, 529 optimization,
  UGMA/UTMA strategy, trust vs. direct inheritance modeling, estate tax basics. Use when the user says
  "generational wealth", "wealth for my kids", "kids' Roth IRA", "529 plan", "college savings",
  "inheritance planning", "custodial account", "estate planning", "leave money to my children",
  "teach my kids about money", "UGMA", "UTMA", "trust fund", or mentions any child/family
  wealth planning goal.
version: 0.1.0
---

# Generational Wealth Planner

Design a wealth transfer strategy that gives the next generation a compounding head start.

## Core Philosophy

Generational wealth isn't just about leaving money behind. It's about giving your children the most powerful asset: time in the market. A $500/year Roth IRA started at age 16 becomes $1.2M by age 65 — tax-free. The math is magical because of the 50-year runway.

## Required Input

- Number and ages of children
- Current savings for children (529, custodial, etc.)
- Children's earned income (if any — enables Roth IRA)
- Education goals and cost estimates
- User's estate size estimate (for estate tax relevance)
- User's state (for 529 tax deduction)
- Any existing trusts or estate plans

## Planning Framework

### Step 1: The Roth IRA Opportunity (Priority #1 for working children)

Read `references/generational-vehicles.md` for account rules.

If any child has earned income (babysitting, lawn mowing, part-time job), a custodial Roth IRA is the single most powerful generational wealth tool. Show the compound projection:

```
Custodial Roth IRA Projection
Child's age: [X] | Contribution: $[X]/year until 22
─────────────────────────────────────
At age 30:  $XX,XXX
At age 40:  $XXX,XXX
At age 50:  $XXX,XXX
At age 60:  $X,XXX,XXX
At age 65:  $X,XXX,XXX (ALL TAX-FREE)
Total invested: $XX,XXX | Total value: $X,XXX,XXX
Return on invested capital: XX,XXX%
```

### Step 2: 529 Plan Optimization

Analyze education funding needs:
- Estimate college costs (current ~$25K/yr public, $60K/yr private, growing at ~5%/yr)
- Calculate 529 contribution needed for target
- Identify state tax deduction (some states give 5-10% deduction)
- New 2024 rule: unused 529 can roll to Roth IRA (up to $35K lifetime, 15yr minimum age)

Strategy options:
1. **Full-fund approach**: Front-load 529 to maximize compounding
2. **Match approach**: Match child's savings/earnings
3. **Superfund**: Contribute 5 years of gift exclusion at once ($90K per parent in 2025)
4. **Partial-fund**: Cover 50-75%, child covers rest (builds ownership mentality)

### Step 3: UGMA/UTMA Custodial Accounts

When to use vs. not:
- Use when: child has no earned income, want flexibility beyond education
- Avoid when: large balances (becomes child's asset at 18/21, affects financial aid, "kiddie tax")
- Tax advantage: first $1,300 of investment income tax-free, next $1,300 at child's rate
- Risk: child gets full control at majority age — no strings attached

### Step 4: Trust Strategies (for estates >$1M)

Overview of options (not legal advice — suggest estate attorney):
- **Revocable Living Trust**: Avoids probate, no tax benefit
- **Irrevocable Trust**: Removes assets from estate, potential tax benefit
- **Crummey Trust**: Annual exclusion gifts to trust
- **Dynasty Trust**: Multi-generational, state-dependent

Flag: if total estate approaches $13.61M (2024 exemption), estate planning becomes critical.

### Step 5: Teaching Plan

Wealth transfer without financial literacy is a liability. Include age-appropriate milestones:
- Ages 5-10: Allowance with save/spend/give jars
- Ages 11-14: Custodial brokerage account, pick first stock together
- Ages 15-17: First job → custodial Roth IRA, budgeting basics
- Ages 18-22: Credit building, compound interest deep dive, first tax return
- Ages 22+: Roth conversion of custodial to personal, full investment thesis

## Output Format

```
GENERATIONAL WEALTH PLAN
═══════════════════════════
[For each child:]

[Child Name], Age [X]
────────────────────
ACCOUNTS:
  Roth IRA:     $XXX → projected $X.XM by age 65 (tax-free)
  529 Plan:     $XXX → covers XX% of estimated college costs
  UGMA/UTMA:    $XXX → available at age 18/21

ACTIONS NOW:
  1. [Specific action with dollar amounts]
  2. [Specific action]

MILESTONES:
  Age XX: [Event/action]
  Age XX: [Event/action]

TOTAL GENERATIONAL IMPACT:
  Invested by parent: $XX,XXX over XX years
  Projected value at child's age 65: $X,XXX,XXX
  Effective return: XX,XXX%
```

Always chain: "Want me to set up tracking for your generational plan in the weekly pulse?"

## Important Notes

- Always flag: "This involves estate and tax planning — consult an estate attorney and CPA for implementation"
- Emphasize: small amounts over long time horizons create enormous wealth
- Never pressure — not all users want to plan for children's finances
- Respect that some users may not have children but want to plan for nieces/nephews or other family
