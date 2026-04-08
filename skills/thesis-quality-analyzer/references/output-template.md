# Thesis Quality Analyzer — Output Template

Use this exact structure. Do not skip sections. Every section must have concrete content — no placeholders or "TBD."

## Full Output Format

```
╔══════════════════════════════════════════════════════════════════════╗
║  THESIS QUALITY REPORT                                              ║
║  Source: [Author / Channel / Publication]                           ║
║  Analyzed: [Date]                                                   ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  VERDICT: [Grade] — [One-sentence summary]                          ║
║  Quality Score: [X]/20 (after source modifier: [Y]/20)              ║
║                                                                      ║
║  Source type: [Institutional / Independent / YouTuber / Social]      ║
║  Source modifier: [+1/0/-1/-2/-3]                                    ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  CLAIMS SCORECARD                                                    ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  #  Claim                    Test  Mech  Fals  Time  TOTAL  Action   ║
║  ── ──────────────────────── ────  ────  ────  ────  ─────  ──────── ║
║  1  [Short name]              X     X     X     X    XX/20  VERIFY   ║
║  2  [Short name]              X     X     X     X    XX/20  MONITOR  ║
║  3  [Short name]              X     X     X     X    XX/20  HEDGE    ║
║  4  [Short name]              X     X     X     X    XX/20  REJECT   ║
║                                                                      ║
║  Average: XX/20 → Grade [A/B/C/D/F]                                 ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  ⚠️  KILL ASSUMPTION                                                 ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  Claim #X: [Full statement]                                         ║
║  If wrong: [What happens to the entire thesis]                      ║
║  Check:    [Specific verification step you can do RIGHT NOW]        ║
║  Deadline: [When you'll know if it's right or wrong]                ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  PORTFOLIO OVERLAP                                                   ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  Already exposed to:  [tickers from profile/holdings.md that align] ║
║  Current allocation:  [X%] (thesis wants [Y%])                      ║
║  Concentration risk:  [If thesis + current = too much in one sector] ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

## The Action Plan (THE MOST IMPORTANT PART)

This must be concrete. No "consider" or "think about." Only "do this."

```
═══════════════════════════════════════════════════════════════════════
  ACTION PLAN
═══════════════════════════════════════════════════════════════════════

  🔴 ACT NOW (do today — no further analysis needed)
  ────────────────────────────────────────────────────────────────────
  1. [Specific action with ticker/amount/tool]
     Why: [one line — which claim this validates or executes]

  2. [Next action]
     Why: [one line]

  🟡 VERIFY FIRST (do this before committing capital)
  ────────────────────────────────────────────────────────────────────
  1. Run /strategy-lab: "[specific strategy to test]"
     Pass condition: [what makes this investable]
     If it fails: [what you do instead]

  2. Run /macro-radar: check [specific signal]
     Confirm if: [threshold]
     Invalidate if: [threshold]

  🟢 MONITOR ONGOING (set these watchpoints)
  ────────────────────────────────────────────────────────────────────
  1. [Signal]: currently [level] — watch for [threshold]
     Check: [frequency]
     If triggered: [specific action]

  🛡️ HEDGE THESE (protect against untestable claims)
  ────────────────────────────────────────────────────────────────────
  1. Claim #X: [name]
     Max position: [X%] of portfolio
     Stop-loss: [level]
     Time box: [months] — exit if not working by [date]

  ❌ DO NOT TRADE
  ────────────────────────────────────────────────────────────────────
  1. Claim #X: [name] — [reason in one sentence]

  📍 NEXT SKILL
  ────────────────────────────────────────────────────────────────────
  → If verdict is A or B: Run /thesis-to-trades to align portfolio
  → If macro claims need validation: Run /macro-radar first
  → If technical claims need testing: Run /strategy-lab first
  → If verdict is C or below: Do NOT proceed to trading skills

═══════════════════════════════════════════════════════════════════════
```

## Bear Case Section (Required)

Always include one counter-argument per high-scoring claim. Use web search if needed.

```
  🐻 BEAR CASE — What if this thesis is wrong?
  ────────────────────────────────────────────────────────────────────
  Claim 1 counter: [One sentence — the strongest argument against]
  Claim 2 counter: [One sentence]
  ...

  Worst-case portfolio impact if ALL claims fail:
    Estimated loss: -$[X,XXX] ([Y%] of portfolio)
    Assuming: [position sizes from action plan + stop-losses hit]
```

## Saving

Always save to `profile/theses/[slugified-name].md` and append to `profile/history.md`.

If `profile/theses/` directory doesn't exist, create it.
