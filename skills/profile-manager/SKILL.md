---
name: profile-manager
description: >
  Internal skill for reading and writing the user's financial profile. Not directly invoked by users —
  called by other skills to load context and save new data. Manages profile/financial-identity.md,
  profile/holdings.md, profile/goals.md, and profile/history.md.
version: 0.1.0
---

# Profile Manager (Internal Skill)

This skill is the data layer for Money OS. It manages persistent financial profile data across sessions.

## Profile Location

All profile data lives in the user's workspace folder under `profile/`. The exact path depends on the environment:
- In Cowork: the selected workspace folder + `profile/`
- In Claude Code: the project root + `profile/`

## Profile Files

### profile/financial-identity.md
Core financial identity that rarely changes:
- Filing status, state, age, dependents
- Income (gross, type, trajectory)
- Tax profile (brackets, effective rate)
- Employer benefits (401k match, HSA, ESPP, Mega Backdoor)

### profile/holdings.md
Portfolio snapshot — updated when user shares new data:
- Account-by-account holdings (symbol, shares, value, cost basis)
- Cash reserves and HYSA rates
- Debt summary (type, balance, rate, payment)

### profile/goals.md
Aspirational targets — evolves over time:
- Freedom Number (monthly passive income target)
- Freedom portfolio target and current progress percentage
- Short/medium/long-term goals with amounts and dates
- "The Dream" — their aspirational vision in their own words

### profile/history.md
Append-only session log:
- Date, skill used, key findings, actions recommended, decisions made
- Never edit past entries — only append new ones
- This becomes the raw material for progress narratives in weekly-pulse

## Reading the Profile

When any skill starts, it should attempt to read relevant profile files.

### Load Pattern

```
1. Check if profile/ directory exists
2. If yes, read the relevant files:
   - All skills: financial-identity.md (for tax bracket, filing status)
   - Portfolio skills: holdings.md
   - Goal-related skills: goals.md
   - Progress-tracking skills: history.md
3. If no, proceed without profile (ask user for needed data)
4. If partial, use what exists and ask for what's missing
```

### Which Skills Read Which Files

| Skill | identity | holdings | goals | history |
|-------|----------|----------|-------|---------|
| freedom-number | ✓ age, income | ✓ portfolio value | ✓ Freedom Number | ✓ prior calculations |
| portfolio-health-check | ✓ age | ✓ full holdings | | |
| rebalancing-plan | ✓ tax bracket | ✓ full holdings | | |
| tax-strategy | ✓ full identity | ✓ holdings for location | ✓ goals for planning | |
| tax-harvest | ✓ tax bracket | ✓ full holdings | | |
| tax-return-analyzer | ✓ full identity | | | |
| cash-flow-intel | ✓ income, benefits | | ✓ savings targets | |
| wealth-leak-scanner | ✓ full identity | ✓ holdings for fees | | |
| weekly-pulse | ✓ identity | ✓ holdings | ✓ goals | ✓ full history |
| macro-radar | | ✓ holdings | | |
| decision-modeler | ✓ tax bracket, age | ✓ relevant holdings | ✓ relevant goals | |
| life-event-router | ✓ full identity | ✓ holdings | ✓ goals | |
| generational-wealth | ✓ identity | ✓ holdings | ✓ goals | |
| thesis-to-trades | | ✓ full holdings | | |
| financial-courage | | | ✓ goals/dream | ✓ progress |
| financial-educator | | | | ✓ learning history |

## Writing to the Profile

### Update Rules

1. **Never overwrite without telling the user.** If a skill discovers new data that differs from the profile, show the diff: "Your profile says X, but you just mentioned Y. Should I update it?"

2. **Append to history, never edit.** history.md is an append-only log. Each entry starts with a date header.

3. **Update holdings conservatively.** Only update specific positions that the user explicitly provides new data for. Don't assume missing positions were sold.

4. **Goals evolve — update eagerly.** If the user mentions a new goal or updates a target, suggest updating goals.md.

5. **Financial identity is stable — update carefully.** Tax bracket, filing status, etc. rarely change. If someone mentions a new state or a marriage, confirm before updating.

### Write Pattern

```
1. Skill completes its analysis
2. Identify new data discovered during the analysis
3. For significant new data:
   a. Tell the user what you learned
   b. Ask: "Should I save this to your profile for next time?"
   c. If yes, update the appropriate file
4. Always append a summary to history.md:
   "[Date] — [skill name]: [one-line summary of what happened]"
```

### History Entry Format

```markdown
## [YYYY-MM-DD] — [Skill Name]
- **Action**: [What the user asked for]
- **Key findings**: [1-2 bullet summary]
- **Recommendations**: [What was recommended]
- **Decisions**: [What the user decided, if any]
- **Profile updates**: [What was updated in the profile, if any]
```

## Profile Initialization

When `/setup` or `/money-os` runs for the first time:

1. Create `profile/` directory
2. Create all 4 files with template headers
3. Guide user through the setup conversation (see setup command)
4. Save data as it's shared
5. Calculate initial Freedom Number and progress
6. Log the setup in history.md

## Migration

If a user has been using Money OS v3.0 (stateless) and upgrades:
- Their first interaction should offer to build a profile from conversation
- "I notice you don't have a profile yet. If you share some basics, I can remember you between sessions. Want to do a quick 3-question setup?"

## Important Notes

- Disclaimer: "Profile data is stored locally on your computer in plaintext markdown files. You can edit or delete any file at any time."
- Never write to profile files without user confirmation
- Never store raw conversation text — only structured financial data
