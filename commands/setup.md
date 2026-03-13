---
description: Set up your Money OS financial profile — guided onboarding that builds your profile through conversation
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
argument-hint: [optional: "quick" for essentials only, or just start]
---

# Money OS Setup — Financial Profile Builder

Build the user's financial profile through a guided, warm conversation. This is NOT a form — it's a conversation that naturally extracts financial data and stores it in structured files.

## Philosophy

- Ask questions one at a time, not a wall of fields
- Explain WHY each piece of data matters (connect to specific skills)
- Let them skip anything they're not comfortable sharing
- Celebrate what they DO share ("Great — that's enough for me to calculate your Freedom Number")
- Save after each section so progress isn't lost

## Profile Structure

Create these files in the user's workspace under `profile/`:

### 1. profile/financial-identity.md

```markdown
# Financial Identity
*Last updated: [date]*

## Basics
- Filing status: [single / married filing jointly / married filing separately / head of household]
- State of residence: [state]
- Age: [age]
- Dependents: [count and ages]

## Income
- Annual gross income: $[amount]
- Income type: [W-2 / 1099 / mixed]
- Expected trajectory: [stable / growing X%/yr / variable]

## Tax Profile
- Estimated federal tax bracket: [XX%]
- State income tax rate: [XX%]
- Effective tax rate (if known): [XX%]

## Employer Benefits
- 401k available: [yes/no]
- 401k match: [X% up to Y%]
- HSA eligible: [yes/no]
- ESPP available: [yes/no, discount %]
- Mega Backdoor Roth available: [yes/no/unknown]
- Other notable benefits: [list]
```

### 2. profile/holdings.md

```markdown
# Holdings
*Last updated: [date]*

## Summary
- Total portfolio value: $[amount]
- Account types: [list: taxable, Traditional IRA, Roth IRA, 401k, HSA, etc.]

## By Account
### [Account Name] ([type]) — $[value]
| Symbol | Shares | Value | Cost Basis | Gain/Loss |
|--------|--------|-------|------------|-----------|
| ...    | ...    | ...   | ...        | ...       |

### [Next Account...]

## Cash Reserves
- Emergency fund: $[amount] ([X months] of expenses)
- HYSA rate: [X%]
- Other cash: $[amount]

## Debt
| Type | Balance | Rate | Monthly Payment |
|------|---------|------|-----------------|
| ...  | ...     | ...  | ...             |
```

### 3. profile/goals.md

```markdown
# Financial Goals
*Last updated: [date]*

## Freedom Number
- Target monthly passive income: $[amount]
- Freedom portfolio target: $[amount]
- Current freedom progress: [XX%]
- Target freedom age: [age]

## Short-term Goals (< 1 year)
- [Goal]: $[target] by [date]

## Medium-term Goals (1-5 years)
- [Goal]: $[target] by [date]

## Long-term Goals (5+ years)
- [Goal]: $[target] by [date]

## The Dream
[What they said when asked "what would your Tuesday morning look like if money weren't a worry?"]
```

### 4. profile/history.md

```markdown
# Money OS History
*Session log — append only*

## [Date] — First Setup
- Profile created
- Key facts: [summary of financial identity]
- Initial Freedom Number: $[X]/month
- Initial freedom progress: [XX%]
- Recommended first actions: [list]
```

## Conversation Flow

### Quick Mode (if they said "quick")
Ask only 3 things:
1. Monthly expenses (rough)
2. Current savings/investments (rough total)
3. Monthly savings rate

Then calculate a rough Freedom Number and offer to go deeper.

### Full Mode

**Section 1: "Let's start simple"**
- "What's your approximate monthly spending? Don't overthink it — a ballpark is fine."
- "And roughly how much do you have saved or invested across all accounts?"
- "How much are you saving or investing each month?"

→ After getting these 3, immediately calculate and show their Freedom Number progress. This creates instant value and motivation to continue.

**Section 2: "Let's get specific" (optional)**
- Filing status and state (for tax calculations)
- Age (for timeline modeling)
- Income details (for tax bracket and strategy)
- Employer benefits (for optimization)

**Section 3: "Your portfolio" (optional)**
- "Do you have investment accounts? If you can share the holdings, I can run a health check."
- Accept in any format: screenshot, typed list, brokerage export
- Parse and structure into holdings.md

**Section 4: "Your goals" (optional)**
- "If money weren't stressful, what would your life look like?"
- "Any specific financial goals — buying a house, retiring by a certain age, kids' college?"

**Section 5: "Your debts" (optional)**
- "Any debts we should know about? Student loans, mortgage, credit cards?"
- Frame positively: "This helps us find optimization opportunities"

## After Setup

1. Save all profile files
2. Show a summary: "Here's what I know about you now. Your Freedom Number is $X/month, you're XX% there, and here's your estimated timeline."
3. Recommend next steps:
   - "Want me to scan for wealth leaks? (typical: $2K-8K/year in hidden drains)"
   - "Want a full portfolio health check?"
   - "Want to see your detailed Freedom Number with Monte Carlo simulation?"
4. Log the setup to history.md

## Privacy Note

Tell them: "Everything I just learned is stored in a file on YOUR computer — `profile/` in your workspace folder. I don't send it anywhere. You can edit or delete it anytime."

$ARGUMENTS
