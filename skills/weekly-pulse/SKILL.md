---
name: weekly-pulse
description: >
  Generate a weekly or monthly financial life narrative that connects numbers to goals, freedom
  progress, and life events. Not a dashboard — a story that makes you feel your progress.
  Use when the user says "weekly pulse", "weekly report", "how am I doing financially",
  "monthly financial summary", "what happened with my money this week", "financial update",
  "progress report", "how close am I to my goals", or at a regular scheduled cadence.
version: 0.1.0
---

# Weekly Pulse — Financial Narrative Generator

Generate a personalized financial narrative that transforms raw numbers into a meaningful story about the user's financial life.

## Core Philosophy

Numbers are forgettable. Stories stick. This skill turns financial data into a narrative the user actually wants to read — one that connects every dollar to the life they're building.

Never produce a table-of-numbers dump. Every metric must be tied to a goal, a feeling, or an action.

## Required Input

Gather what's available (not all required — work with what you have):
- Current portfolio values (by account and total)
- Recent transactions or spending summary
- Any trades executed this week
- Income received
- Market movements affecting holdings
- Changes since last pulse (if prior pulse exists)
- User's stated goals/Freedom Number (if established)

If this is the first pulse, ask for baseline data. If recurring, reference prior state.

## Narrative Structure

### Opening: The Headline

One sentence that captures the most important thing that happened.

Examples:
- "Your net worth crossed $250K this week — a milestone you set 18 months ago."
- "A quiet week financially, but your compound machine added $340 in tax-free growth."
- "VIX spiked to 26 — your macro radar flagged it, and here's what to watch."

### Section 1: Freedom Progress

If the user has a Freedom Number established:
```
FREEDOM PROGRESS: XX.X% → XX.X% (+X.X%)
[Visual progress bar]
Passive income: $X,XXX/mo of $X,XXX/mo target
At current pace: X.X years to freedom
This week's contribution to freedom: $X,XXX
```

If no Freedom Number, suggest establishing one (hook to freedom-number skill).

### Section 2: The Story of Your Money This Week

Write 2-3 paragraphs in natural language. Cover:
- Net worth change (decomposed: savings vs. market appreciation vs. other)
- Notable trades and their strategic rationale
- Tax events (harvests, conversions, bracket implications)
- Spending patterns worth noting (not to shame — to inform)
- Any wealth leaks plugged or identified

Example narrative tone:
"Your portfolio gained $3,200 this week, but the story isn't the market's 2% rally — it's the tax-loss harvest you executed on Tuesday. By swapping FUBO for VGT, you preserved $1,847 in tax deductions while maintaining identical tech exposure. That single move saves you $462 at your 25% marginal rate. The market gave you $3,200 in paper gains; you created $462 in real, permanent tax savings."

### Section 3: Scorecard

Quick-hit metrics in a compact format:
```
THIS WEEK'S SCORECARD
─────────────────────
Net Worth:      $XXX,XXX  (▲ $X,XXX / +X.X%)
Savings Rate:   XX%       (target: XX%)
Tax Alpha YTD:  $X,XXX    (losses harvested + Roth conversions + optimizations)
Portfolio Risk:  X.X/10   (concentration score)
Cash Reserve:   XX%       (target: 20-30%)
Wealth Leaks:   $XXX/mo   (X items detected)
```

### Section 4: Actions Taken & Impact

List every financial action from the week with its projected long-term impact:
```
ACTIONS THIS WEEK
1. [Action] — Impact: [Projected long-term value]
2. [Action] — Impact: [Projected long-term value]
Total value created this week: $X,XXX (immediate) + $XX,XXX (projected 20yr)
```

### Section 5: What's Coming

Look ahead 1-2 weeks:
- Upcoming RSU vests or option expiry
- Tax deadlines approaching
- Rebalancing triggers approaching
- Market events to watch (earnings, Fed meetings)
- Recurring contribution dates
- Any action items from prior pulses still pending

### Section 6: Micro-Lesson (The Weekly Insight)

End with one short (3-5 sentence) financial concept that's relevant to something that happened this week. Teach by connecting to the user's real experience.

Example:
"This week's insight: **Asset location vs. asset allocation.** You trimmed PLTR in your Roth IRA — zero tax. If that same trim happened in your taxable account, you'd owe $1,100 in capital gains tax. Same portfolio change, different account = $1,100 difference. This is why WHERE you hold matters as much as WHAT you hold."

## Tone Guidelines

- Warm but substantive — like a smart friend who happens to be a financial advisor
- Celebrate progress without being patronizing
- Frame setbacks as information, not failures
- Use concrete numbers, not vague encouragement
- Connect every metric to the user's stated life goals
- End on a forward-looking, energizing note

## Scheduling

If the user wants recurring pulses:
- Suggest: Sunday evening (prep for the week) or Monday morning (start the week informed)
- Can also do monthly deep-dive versions with more analysis
- Hook to scheduled tasks if available

## Output Format

Deliver as clean markdown text in conversation. If the user wants a file, generate as .md.

Always end with: "Want to drill into any section? Or run a full portfolio health check?"
