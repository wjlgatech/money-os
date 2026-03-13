---
name: share-cards
description: >
  Internal skill that generates shareable HTML artifact cards designed for screenshotting and social media.
  Called by other skills after analysis is complete. Not directly invoked by users.
  Produces single-file HTML cards with embedded CSS — no external dependencies.
version: 0.1.0
---

# Share Card Generator (Internal Skill)

After a skill completes its analysis, it can generate a "share card" — a single-screen visual artifact designed to be screenshotted and posted on social media.

## Design Principles

1. **Identity, not disclosure.** Cards show progress and aspiration, not raw financial data. "I'm 42% to freedom" is shareable. "$487,000 in my 401k" is not.
2. **Beautiful and minimal.** Dark gradient background, clean typography, one key number.
3. **Branded.** Every card says "Money OS" with a subtle tagline. This is the viral branding mechanism.
4. **No PII.** Never include name, account numbers, specific dollar amounts of holdings, or any identifiable data. Only percentages, ratios, and anonymized metrics.

## Card Templates

### 1. Freedom Card (from freedom-number skill)

Shows: Freedom progress percentage, monthly target, years to freedom

Key visual: Large circular progress ring showing XX% to freedom

Data displayed:
- Freedom Progress: XX% (large, central)
- Monthly Target: $X,XXX/month
- Estimated Timeline: X years
- "Financial freedom is when work becomes a choice."

### 2. Leak Report Card (from wealth-leak-scanner skill)

Shows: Total annual leaks found, number of leaks, 20-year compound value

Key visual: Large dollar amount of annual leaks found

Data displayed:
- "I found $X,XXX/year in hidden wealth leaks"
- XX leaks across X categories
- 20-year compound value: $XXX,XXX
- "How much are you losing without knowing it?"

### 3. Courage Card (from financial-courage skill)

Shows: The emotional journey and the surprising number

Key visual: Before → After emotional state with the pivotal number

Data displayed:
- "From '[user's fear]' to a plan."
- The key number that changed perspective (Freedom Number, or monthly plan amount)
- "The hardest step is the first one. I took it."

### 4. Cash Flow Card (from cash-flow-intel skill)

Shows: Freedom Impact Score and surplus routing

Key visual: Monthly surplus amount and where it's going

Data displayed:
- Monthly Surplus: $X,XXX
- Freedom Impact Score: X.X/3.0
- Top routing destination and amount
- "Every dollar has a job. Mine are working."

### 5. Weekly Pulse Card (from weekly-pulse skill)

Shows: Week-over-week progress

Key visual: Simple trend arrow with key metric

Data displayed:
- Freedom progress change this week: +X.X%
- Key win of the week (one line)
- Streak counter: "Week X of building wealth"
- "Small moves, compounding results."

### 6. Tax Alpha Card (from tax-strategy or tax-return-analyzer skill)

Shows: Tax optimization opportunities found

Key visual: Large number showing estimated annual tax savings

Data displayed:
- "Found $X,XXX in tax optimization opportunities"
- Number of strategies identified
- "Your money. Your future. Optimized."

## HTML Template Structure

Every card follows this HTML structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Money OS — [Card Type]</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
    color: #e8e8e8;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
  }

  .card {
    width: 480px;
    padding: 48px 40px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(20px);
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .card::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at 30% 30%, rgba(99, 179, 237, 0.06) 0%, transparent 50%);
    pointer-events: none;
  }

  .hero-number {
    font-size: 72px;
    font-weight: 800;
    background: linear-gradient(135deg, #63b3ed, #4fd1c5);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.1;
    margin: 16px 0;
  }

  .subtitle {
    font-size: 18px;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 24px;
    line-height: 1.4;
  }

  .detail {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.4);
    margin: 8px 0;
  }

  .tagline {
    font-size: 16px;
    color: rgba(99, 179, 237, 0.8);
    font-style: italic;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .brand {
    margin-top: 24px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.25);
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  /* Progress ring for Freedom Card */
  .progress-ring {
    width: 200px;
    height: 200px;
    margin: 0 auto 16px;
  }

  .progress-ring circle {
    fill: none;
    stroke-width: 8;
    stroke-linecap: round;
    transform: rotate(-90deg);
    transform-origin: center;
  }

  .progress-ring .bg { stroke: rgba(255, 255, 255, 0.06); }
  .progress-ring .fill { stroke: url(#gradient); transition: stroke-dashoffset 1s ease; }
</style>
</head>
<body>
<div class="card">
  <!-- Card-specific content here -->

  <div class="brand">MONEY OS</div>
</div>
</body>
</html>
```

## Integration Points

After each of these skills completes its analysis, offer to generate a share card:

- freedom-number → "Want a Freedom Card to track your progress?"
- wealth-leak-scanner → "Want a Leak Report card to see your results at a glance?"
- financial-courage → "Want a Courage Card to remember this moment?"
- cash-flow-intel → "Want a Cash Flow card showing your surplus routing?"
- weekly-pulse → "Want a Pulse Card for this week's progress?"
- tax-strategy / tax-return-analyzer → "Want a Tax Alpha card showing what we found?"

The card should be saved as an HTML file in the workspace and presented to the user.

## Privacy Safeguards

Before generating any card:
1. Strip all PII (no names, no account numbers, no specific holdings)
2. Use percentages and ratios instead of absolute dollar amounts where possible
3. If dollar amounts are shown, round to nearest hundred and use only surplus/savings figures (not portfolio totals)
4. Never include tax bracket, income, or net worth on share cards
5. The card should be shareable without revealing anything the user wouldn't want public

## Important Notes

- Cards are meant to be screenshotted — optimize for mobile screenshot aspect ratio (roughly 9:16 or square)
- Dark backgrounds render well on most social platforms
- The gradient color scheme should be consistent across all card types for brand recognition
- Every card is self-contained HTML — no external fonts, no external CSS, no JavaScript required
- Disclaimer: share cards are visual summaries, not financial advice. The underlying analysis includes full context and caveats.
