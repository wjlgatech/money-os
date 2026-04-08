# Action Routing Table

## The Rule: Every Claim Gets ONE Primary Action

Don't produce a list of things to "think about." Produce a list of things to DO. Each claim maps to exactly one action type based on its scores.

## Routing Logic

```
Is claim Testability ≥ 4?
  ├─ YES → Is it a technical/price claim?
  │         ├─ YES → ACTION: VERIFY via strategy-lab backtest
  │         └─ NO  → Is it a macro/rates/commodity claim?
  │                   ├─ YES → ACTION: MONITOR via macro-radar
  │                   └─ NO  → ACTION: VERIFY via fundamentals API
  └─ NO → Is the mechanism score ≥ 3?
           ├─ YES → ACTION: HEDGE (plausible but unverifiable — size small, set stops)
           └─ NO  → ACTION: REJECT (no evidence, no mechanism — don't trade it)
```

## Action Type Details

### VERIFY via Backtest (route to strategy-lab)

**When:** Claim makes a testable price/technical prediction

**How to formalize for strategy-lab:**
1. Extract the entry rule from the claim → "Buy when [condition]"
2. Extract the exit rule → "Sell when [profit target] or [stop loss]"
3. Define the ticker universe → the specific stocks/ETFs the thesis mentions
4. Run over 2-year history minimum

**What to look for in results:**
- Win rate > 50% AND profit factor > 1.2 → claim is supported by historical data
- Win rate < 45% OR profit factor < 1.0 → claim fails historical test
- Insufficient trades (< 10) → inconclusive, need longer history or broader universe

**Template output:**
```
ACTION: VERIFY via backtest
  Skill:    → Run /strategy-lab
  Strategy: "Buy [ticker] when [entry from claim], sell at [exit from claim]"
  Universe: [tickers from thesis]
  Period:   2-year lookback
  Pass if:  Win rate > 50%, Sharpe > 1.0, profit factor > 1.2
  Fail if:  Negative total return or Sharpe < 0.5
```

### VERIFY via Fundamentals (route to screener API)

**When:** Claim makes a valuation/growth assertion

**How to check:**
1. Call `GET /api/fundamentals?tickers=[tickers from claim]`
2. Compare claimed metrics to actual data
3. Example: "TSMC is undervalued" → check P/E vs sector average, revenue growth trend

**Template output:**
```
ACTION: VERIFY via fundamentals
  API:      → GET /api/fundamentals?tickers=TSM,ASML,AMAT
  Check:    [Specific metric] — claim says [X], verify actual value
  Pass if:  [Metric matches claim within reasonable range]
  Fail if:  [Metric contradicts claim]
```

### MONITOR via Macro Radar (route to macro-radar)

**When:** Claim involves macro conditions (rates, oil, VIX, currency, geopolitics)

**How to set up monitoring:**
1. Identify the specific signal from macro-radar signal definitions
2. Define threshold that confirms OR invalidates the claim
3. Set check frequency

**Template output:**
```
ACTION: MONITOR signal
  Skill:      → Run /macro-radar (or web search for current level)
  Signal:     [VIX / WTI / 10Y yield / DXY / gold / etc.]
  Current:    [fetch via web search]
  Bullish if: [specific threshold — confirms thesis]
  Bearish if: [specific threshold — invalidates thesis]
  Frequency:  [daily / weekly / monthly]
  Deadline:   [when to reassess if signal hasn't triggered]
```

### HEDGE (for plausible but unverifiable claims)

**When:** Mechanism makes sense (score ≥ 3) but you can't test it (testability ≤ 3)

**The hedge framework:**
1. Cap position size — never allocate more than 3% of portfolio to an unverifiable claim
2. Set hard stop-loss — define the "I was wrong" price BEFORE entering
3. Define the exit trigger — what observable event tells you the claim has failed?
4. Set a time limit — if the thesis hasn't played out in N months, exit regardless

**Template output:**
```
ACTION: HEDGE against failure
  Position: Max [X]% of portfolio — because this claim can't be verified
  Stop:     [specific price or %-loss]
  Exit if:  [observable event that disproves the claim]
  Time box: [N months] — if not working by then, close and redeploy
  Why hedge: Mechanism is [description], but evidence is [description of gap]
```

### REJECT (for claims with no evidence and no mechanism)

**When:** Testability ≤ 2 AND Mechanism ≤ 2

**Do not:**
- Allocate any capital to this specific claim
- Try to verify something unverifiable (wasted effort)
- Dismiss the entire thesis because one claim is weak

**Do:**
- Explain WHY this claim doesn't meet the bar, in one sentence
- Check if any other claims in the thesis cover similar ground (redundancy)
- If this is the kill assumption, it downgrades the entire thesis

**Template output:**
```
ACTION: REJECT
  Do not trade this claim.
  Reason:     [specific: unfalsifiable / no mechanism / contradicts current data]
  Salvageable: [is there a testable version of this idea buried inside?]
  Impact:     [does rejecting this claim affect other claims in the thesis?]
```

## Portfolio-Weighted Sizing

When routing to thesis-to-trades, the claim scores should influence position sizes:

| Claim Score | Position Size Multiplier |
|-------------|------------------------|
| 16-20 | 1.0x (full conviction size) |
| 12-15 | 0.7x (reduced) |
| 8-11 | 0.4x (small, exploratory) |
| 4-7 | 0x (don't trade this claim) |

Example: If standard position is 3% of portfolio:
- A-grade claim: 3%
- B-grade claim: 2.1%
- C-grade claim: 1.2%
- D-grade claim: 0%

This way, the portfolio naturally weights toward the strongest claims.

## Chaining to Other Skills

After the action plan is complete, suggest the appropriate next skill:

| Action Plan Result | Next Skill |
|-------------------|------------|
| Multiple claims pass verification | → thesis-to-trades (align portfolio) |
| Macro claims need checking | → macro-radar (current signal check) |
| Technical claims need backtesting | → strategy-lab (formalize + test) |
| Thesis overlaps heavily with current portfolio | → portfolio-health-check (concentration risk) |
| Thesis is B-grade with some uncertainty | → decision-modeler (expected value under scenarios) |
| Thesis is C-grade or below | → Do not proceed to trading skills |
