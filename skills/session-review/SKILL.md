---
name: session-review
description: >
  End-of-session skill that reviews what happened and updates the user's financial profile automatically.
  Inspired by OpenClaw's heartbeat pattern. Runs at the end of any Money OS session to capture new data,
  update progress metrics, and log the session to history. Can be triggered by other skills via chaining
  or by the user saying "save what we discussed", "update my profile", or "session review".
version: 0.1.0
---

# Session Review — Self-Evolution Engine

At the end of a Money OS session (or when prompted), this skill reviews the conversation to identify new financial data, updates the profile files, and logs the session.

## Core Philosophy

The user should never have to do a "data entry" session. Money OS learns about them organically through normal use. After 5 sessions, the profile should contain 80%+ of their key financial data — all captured naturally.

## Trigger Conditions

Run this skill when:
1. The user explicitly says "save this", "update my profile", or "session review"
2. Another skill chains to session-review after completing its analysis
3. The conversation is winding down and significant new data was shared

## Review Process

### Step 1: Scan for New Data

Review the conversation and identify any new or updated information across these categories:

**Financial Identity:**
- Filing status mentioned
- State of residence mentioned
- Age mentioned or calculable
- Income figures shared
- Employer benefits discussed
- Tax bracket mentioned or calculable

**Holdings:**
- New account or position mentioned
- Updated values for existing positions
- New debt mentioned
- Cash reserve amounts shared
- Interest rates mentioned

**Goals:**
- Freedom Number calculated or updated
- New financial goals mentioned
- Timeline changes
- Dream/aspiration articulated

**Decisions:**
- Actions recommended
- Actions the user agreed to take
- Actions the user declined
- Key insights the user found valuable

### Step 2: Diff Against Current Profile

For each new data point:
1. Read the relevant profile file
2. Check if this information already exists
3. If it's NEW: flag for addition
4. If it DIFFERS from stored value: flag for update (show the diff)
5. If it CONFIRMS stored value: note the confirmation date

### Step 3: Present Changes to User

Never update silently. Show the user what you learned:

```
SESSION SUMMARY
===============

New data I picked up from our conversation:

FINANCIAL IDENTITY:
  ~ Tax bracket: 24% (previously: unknown)
  ~ State: California (confirmed, no change)

HOLDINGS:
  + New: Fidelity 401k — ~$145,000 (VTI, VXUS, BND)
  ~ Updated: Emergency fund — $12,000 → $15,000

GOALS:
  + New goal: Max out Roth IRA by December
  ~ Freedom progress: 38% → 42% (updated portfolio value)

Shall I save these updates to your profile?
```

### Step 4: Apply Updates (with permission)

If the user confirms:
1. Update `profile/financial-identity.md` with new identity data
2. Update `profile/holdings.md` with new/changed positions
3. Update `profile/goals.md` with new/changed goals
4. Append to `profile/history.md` with session summary

### Step 5: Log the Session

Always append to history.md, even if no profile changes were made:

```markdown
## [YYYY-MM-DD] — Session Review
- **Skills used**: [list of skills invoked this session]
- **Key topics**: [1-2 line summary]
- **New data captured**: [what was added/updated in profile]
- **Recommendations given**: [key recommendations]
- **User decisions**: [what they agreed to do]
- **Freedom progress**: [current %] (was [previous %])
- **Next suggested action**: [what to do next time]
```

## Evolution Metrics

Track these over time in history.md to show progress:

1. **Profile completeness** — What percentage of profile fields are filled?
   - Score: (filled fields / total fields) as a percentage
   - Target: 80% after 5 sessions

2. **Freedom progress trajectory** — Is the user moving toward freedom?
   - Track % change per session and per month

3. **Action completion rate** — Are recommendations being followed?
   - Track: recommendations given vs. completed (user-reported)

4. **Session frequency** — Is the user coming back?
   - Track: days between sessions

## Progress Narrative

When the user returns after a previous session, the /money-os command should reference history.md to create continuity:

Examples:
- "Welcome back! Last session you ran a portfolio health check and found 3 concentration risks. Did you get a chance to start diversifying?"
- "Hey! You've been building your profile over 4 sessions now. Your Freedom Number is $4,200/month and you're at 42%. That's up from 38% when we first calculated it."
- "It's been 3 weeks since your last check-in. Want to run a weekly pulse to see what changed?"

## Integration with Other Skills

### How skills trigger session-review:

Each skill already has a "Profile Integration" section that says to append to history.md. The session-review skill provides the comprehensive end-of-session sweep that catches anything individual skills missed.

Skills should add this at the end of their flow:
```
After completing this skill, check if significant new data was shared that isn't yet captured in the profile.
If yes, note it for the session review or offer to save it now.
```

### How session-review feeds other skills:

- **weekly-pulse** reads history.md to show week-over-week progress
- **financial-courage** reads history.md to show "look how far you've come"
- **freedom-number** reads history.md to show trajectory over time
- **/money-os** reads history.md to personalize the welcome back message

## Important Notes

- NEVER update the profile without showing the user what changed
- NEVER store raw conversation text in the profile — only structured data
- If the user shares contradictory data (e.g., "I have $100K saved" then later "I have $120K"), ask which is current
- Disclaimer: "Profile data is stored locally on your computer. You can edit or delete any file in the profile/ folder at any time."
