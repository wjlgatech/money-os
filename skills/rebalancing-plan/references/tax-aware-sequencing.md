# Tax-Aware Rebalancing Sequencing

## Core Principle

Every sell has a tax consequence in taxable accounts. The ORDER in which you execute trades dramatically affects your total tax bill. Optimize sequence, not just selection.

## Tax Rate Reference (2025-2026 US)

### Long-Term Capital Gains (held > 1 year)
| Taxable Income (Single) | Rate |
|------------------------|------|
| < $47,025 | 0% |
| $47,025 - $518,900 | 15% |
| > $518,900 | 20% |
+ 3.8% Net Investment Income Tax if MAGI > $200k (single) / $250k (married)

### Short-Term Capital Gains (held < 1 year)
Taxed as ordinary income (10%-37% depending on bracket)

## Sequencing Rules (follow this order)

### Phase 1: Harvest Losses (generate tax shield)

Sell all positions with unrealized losses in TAXABLE accounts:
- Prioritize largest dollar losses first
- Track total harvested losses — this is your "tax budget" for gains
- Note: Up to $3,000 in net losses can offset ordinary income per year
- Excess losses carry forward indefinitely

### Phase 2: Rebalance in Tax-Advantaged Accounts (no tax impact)

Make all changes in Roth IRA, Traditional IRA, and 401k accounts:
- Sell/trim/swap freely — no tax consequence
- This is where to make aggressive rebalancing moves
- Roth IRA: best for highest-growth positions (tax-free gains forever)
- Traditional IRA: good for income-generating assets

### Phase 3: Trim Winners in Taxable (offset with Phase 1 losses)

Now trim oversized winning positions in taxable accounts:
- Match gains against Phase 1 losses
- Long-term gains first (lower rate if losses don't fully offset)
- Stop trimming when: remaining gains would exceed your loss budget
- Save remaining trims for next tax year if needed

### Phase 4: Deploy Cash

Buy new positions with freed capital:
- In taxable: watch for wash sale rules (30-day window)
- In tax-advantaged: buy immediately, no wash sale concern
- High-growth buys go in Roth if possible

## Wash Sale Avoidance

### 30-Day Rule
Cannot claim a loss if you buy "substantially identical" security within 30 days BEFORE or AFTER the sale. This applies across ALL accounts (including IRAs).

### Safe Replacements
| Sold | Safe Replacement (not substantially identical) |
|------|----------------------------------------------|
| VTI (Total Market) | ITOT or SCHB (different fund family, same index — debated, consult advisor) |
| Individual stock | ETF containing that stock (generally safe) |
| ARKK | Individual holdings of ARKK (generally safe) |
| Sector ETF (XLK) | Different sector ETF or individual stocks |

### Unsafe Replacements (likely wash sale)
- Selling AAPL in taxable, buying AAPL in Roth within 30 days
- Selling VOO and buying SPY within 30 days (substantially identical)
- Selling shares and buying call options on same stock

## Special Situations

### Lot Selection
When selling partial positions, specify tax lots:
- **FIFO** (First In, First Out): default, may trigger larger gains
- **Specific lot identification**: choose lots to minimize tax — sell highest-cost-basis lots first for gains, lowest-cost-basis for losses
- **Must select before trade settles** at most brokerages

### Year-End Considerations (Nov-Dec)
- Harvest all available losses before Dec 31
- Defer gain realization to January if possible (delays tax by full year)
- Watch for mutual fund capital gains distributions in December

### Net Investment Income Tax (NIIT)
Additional 3.8% on investment income if MAGI exceeds $200k/$250k.
Factor this into gain/loss calculations for high-income investors.
