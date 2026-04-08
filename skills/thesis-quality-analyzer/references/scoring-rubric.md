# Thesis Quality Scoring Rubric

## The 4 Dimensions

### Dimension 1: Testability

Can you check this claim against data that exists right now?

| Score | Label | Description | Examples |
|-------|-------|-------------|----------|
| 5 | Fully backtestable | Historical data exists to run a quantitative test | "Stocks near support bounce 60% of the time" → backtest in strategy-lab |
| 4 | Currently verifiable | Can check right now with live data | "Oil prices are falling" → check WTI on Yahoo Finance |
| 3 | Partly verifiable | Some data exists, but the full claim requires projections | "AI data centers will need 10x more chips" → check current CapEx forecasts, but future demand is a projection |
| 2 | Insider knowledge needed | Claim depends on information not publicly available | "Iran is secretly negotiating" → cannot verify without intelligence sources |
| 1 | Pure narrative | No data could confirm or deny this | "The smart money has already positioned for this" → who? when? what data? |

### Dimension 2: Mechanism Strength

Is the A → B → C causal chain actually supported by evidence?

| Score | Label | Description | Examples |
|-------|-------|-------------|----------|
| 5 | Established economic law | Textbook relationship with strong empirical support | "Lower interest rates increase present value of future earnings" |
| 4 | Historical pattern | Has happened before, with some exceptions | "VIX spikes above 40 have historically been buying opportunities within 6 months" |
| 3 | Plausible chain | Each link is reasonable but the full chain requires multiple things to go right | "Hormuz opens → oil drops → inflation falls → Fed eases → stocks rise" (5 links!) |
| 2 | Speculative chain | One or more links in the chain are unproven or contested | "Reconstruction spending → massive money printing → gold surges" (governments may not print; gold may not respond) |
| 1 | Narrative masking | Sounds logical but has no causal mechanism — correlation or vibes | "It just makes sense that copper goes up when AI grows" (does it? What's the actual consumption data?) |

**Red flag: Count the links.** Every additional link in a causal chain multiplies uncertainty. A → B is strong. A → B → C → D → E is fragile — each link might be 70% likely, but 0.7^4 = 24% for the full chain.

### Dimension 3: Falsifiability

Can you define a specific condition that PROVES this claim wrong?

| Score | Label | Description | Examples |
|-------|-------|-------------|----------|
| 5 | Clear kill condition | One observable event disproves it | "If WTI stays above $90 for 90 days, the oil-drop thesis is dead" |
| 4 | Measurable but ambiguous | Can define a falsification condition, but edge cases exist | "If semi revenue declines for 2 quarters" — but whose? TSM? ASML? The whole sector? |
| 3 | Theoretically falsifiable | You could falsify it, but the data is hard to get or slow to arrive | "If AI investment plateaus" — true, but you won't know for 1-2 years |
| 2 | Moving goalposts | The claim's proponents will always explain away contradicting evidence | "The market hasn't priced it in yet" — when exactly does it count as priced in? |
| 1 | Unfalsifiable | No conceivable evidence could disprove this | "The real manipulation is hidden" / "Smart money operates invisibly" |

### Dimension 4: Timing Precision

Does the thesis tell you WHEN — or could you wait forever?

| Score | Label | Description | Examples |
|-------|-------|-------------|----------|
| 5 | Date-specific catalyst | A known event creates a deadline | "Before TSMC earnings on April 17" / "Within 30 days of ceasefire announcement" |
| 4 | Bounded window | Clear timeframe, no exact date | "Within 6 months" / "Before the next Fed cycle" |
| 3 | General direction | The "when" is a trend, not an event | "As AI adoption accelerates over the next few years" |
| 2 | Vague | Could happen anytime | "Eventually the market will recognize this" |
| 1 | None | No timing information whatsoever | Just "buy X" with no indication of when or why now |

## Aggregation

**Per-claim score** = Testability + Mechanism + Falsifiability + Timing (max 20)

| Per-Claim Score | Interpretation |
|-----------------|----------------|
| 16-20 | High-conviction claim — worth sizing up |
| 12-15 | Moderate — trade it but with hedges |
| 8-11 | Speculative — small position only, with tight stops |
| 4-7 | Weak — don't allocate capital to this specific claim |
| 1-3 | Reject — this claim is not investment-grade |

**Thesis-level score** = Average of all claim scores

If ANY claim scores ≤ 4 AND is the kill assumption, downgrade the entire thesis by one grade (because the whole thesis depends on the weakest link).

## Source Quality Modifier

Apply AFTER scoring individual claims:

| Source Type | Modifier | Reasoning |
|-------------|----------|-----------|
| Peer-reviewed research | +0 | Baseline — this is what "good" looks like |
| Institutional research (Goldman, JPM, etc.) | -1 | They have distribution incentives; may talk their book |
| Independent analyst with track record | -1 | Better aligned, but still single-source |
| YouTuber / newsletter / influencer | -2 | Entertainment incentives ≠ investment incentives; likely talking their book |
| Anonymous social media (Reddit, Twitter) | -3 | No accountability, no track record, pump risk |
| Your own original analysis | +1 | You know your own assumptions and can update them |

Apply modifier to the thesis-level average (not per-claim). Floor at 1.
