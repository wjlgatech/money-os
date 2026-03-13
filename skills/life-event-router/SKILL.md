---
name: life-event-router
description: >
  Detect life events and generate comprehensive financial action plans tailored to each event.
  Use when the user mentions a life event: "I got a raise", "I'm getting married", "having a baby",
  "buying a house", "got laid off", "inheritance", "starting a business", "getting divorced",
  "moving states", "kid going to college", "turning 50", "parent passed away", "got promoted",
  "changing jobs", "RSU vest coming", "bonus coming", or any major life transition that has
  financial implications.
version: 0.1.0
---

# Life Event Router

Every major life event has financial implications that most people miss. This skill detects the event and generates a comprehensive, prioritized action plan.

## Core Philosophy

Life events are financial inflection points. Most people react to them emotionally and miss the 3-5 financial moves that could save or create thousands. The Life Event Router transforms chaos into a checklist.

## How It Works

1. Detect the life event (from user's message or explicit trigger)
2. Load the relevant playbook from `references/life-event-playbooks.md`
3. Personalize based on user's known financial state
4. Generate prioritized action list with deadlines
5. Flag hooks to other Money OS skills

## Event Categories

### Income Events
- **Raise/Promotion**: Adjust withholding, increase 401k, avoid lifestyle inflation
- **Job Change**: 401k rollover, benefits gap analysis, equity comp transition
- **Job Loss**: Emergency fund activation, COBRA vs marketplace, severance optimization
- **Bonus/Windfall**: Tax impact, optimal deployment (DCA vs lump sum), bracket check
- **RSU/ISO Vest**: Exercise strategy, AMT check, diversification plan
- **Side Income Start**: Estimated taxes, SEP IRA/Solo 401k, business expense tracking
- **Retirement**: Social Security timing, RMD planning, healthcare bridge

### Family Events
- **Marriage**: Tax filing status optimization, beneficiary updates, account consolidation
- **Baby**: Life insurance need, 529 setup, dependent care FSA, tax credits
- **Divorce**: Asset division tax implications, QDRO, beneficiary changes
- **Kids Leave Home**: Expense reduction → investment acceleration, downsize analysis
- **Parent Death/Inheritance**: Step-up in basis, estate settlement, inherited IRA rules

### Asset Events
- **Home Purchase**: DTI optimization, down payment source strategy, mortgage rate lock
- **Home Sale**: Capital gains exclusion ($250K/$500K), timing for tax year
- **Car Purchase**: Financing vs cash analysis, EV credit eligibility
- **Large Purchase**: Impact on freedom timeline, financing optimization

### Location Events
- **State Move**: State tax implications, residency rules, 529 plan change analysis
- **International Move**: FBAR/FATCA obligations, tax treaty considerations

### Age Milestones
- **Age 26**: Off parent's health insurance
- **Age 50**: Catch-up contributions ($7,500 additional 401k, $1,000 additional IRA)
- **Age 55**: 401k early withdrawal exception (if separated from service)
- **Age 59.5**: Penalty-free IRA withdrawals
- **Age 62-70**: Social Security claiming strategy
- **Age 65**: Medicare enrollment (don't miss the window!)
- **Age 73**: Required Minimum Distributions begin

## Output Format

For each detected event:

```
LIFE EVENT: [Event Name]
════════════════════════

IMMEDIATE (this week):
  □ [Action] — [Why it matters] — [Dollar impact if quantifiable]
  □ [Action] — [Why it matters]

WITHIN 30 DAYS:
  □ [Action] — [Why it matters] — [Dollar impact]
  □ [Action] — [Why it matters]

WITHIN 90 DAYS:
  □ [Action] — [Why it matters]

DON'T FORGET:
  □ [Action with specific deadline if applicable]

MONEY OS SKILL HOOKS:
  → Run /tax-strategy to model bracket impact
  → Run /freedom to update your freedom timeline
  → Run /cash-flow to re-optimize surplus routing

COMMON MISTAKES TO AVOID:
  ⚠ [Mistake people commonly make with this event]
  ⚠ [Another common mistake]
```

## Profile Integration

Before starting analysis, check for the user's financial profile:

1. Read `profile/financial-identity.md` for full identity context (age, filing status, dependents, income — all relevant to life events)
2. Read `profile/holdings.md` for account structure and balances (affects options available)
3. Read `profile/goals.md` for goals that may change due to life event
4. Read `profile/history.md` for prior life events (to provide continuity and recall context)

If profile exists:
- Reference their known situation to personalize action plan
- Flag changes caused by the life event (filing status, dependents, income, location)
- Prioritize actions based on their specific financial situation
- Avoid re-asking for basic context already captured

If profile doesn't exist or needs updates:
- Ask for identity details relevant to the specific life event
- Offer to create/update profile after event-related decisions are handled

After generating action plan, append a summary to `profile/history.md`:
```
## [Date] — [Event Type]
- **Action**: [Life event - marriage, job change, inheritance, etc.]
- **Key findings**: [Immediate financial implications, deadline-driven actions identified]
- **Recommendations**: [Top 3 actions to take this week, related skills to chain]
```

Also update relevant profile sections:
- If event changes identity (marriage, location move) → update `profile/financial-identity.md`
- If event involves assets (inheritance, home purchase) → update `profile/holdings.md`
- If event changes goals → update `profile/goals.md`

## Important Notes

- Life events are emotional. Lead with empathy, then action.
- For negative events (job loss, divorce, death), acknowledge the difficulty before jumping to financial optimization.
- Always flag when professional help is needed (attorney, CPA, insurance agent)
- Deadlines are critical — many financial actions have windows that close
- Disclaimer: "This is a framework for financial planning, not legal, tax, or investment advice."
