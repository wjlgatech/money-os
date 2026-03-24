---
name: portfolio-import
description: >
  Import portfolio holdings from screenshots, CSVs, or text. Use when the user says
  "import my portfolio", "here's my Fidelity account", "screenshot of my holdings",
  "add my Coinbase", "import from Moomoo", "here's what I own", or pastes/uploads
  any image or text containing financial holdings.
version: 0.1.0
tools:
  - Read
  - Write
---

# Portfolio Import

Extract portfolio holdings from ANY source — screenshots, text, CSV — and write them to the user's local profile. Claude's vision handles the OCR. No API keys, no OAuth, no Plaid needed.

## Supported Input Methods

### Method 1: Screenshot Upload (recommended for most users)

The user takes a screenshot of their broker's positions page and shares it.

**Supported brokers (tested):**
- Fidelity (Positions page)
- Moomoo (Portfolio / Holdings tab)
- Coinbase (Assets page)
- Kraken (Portfolio / Balances)
- Robinhood (Positions)
- Schwab (Positions)
- Vanguard (Holdings)
- Interactive Brokers (Portfolio)
- Any broker with a positions/holdings view

**How to extract from a screenshot:**

1. The user shares an image. Claude sees it via vision.
2. Extract every position visible in the screenshot:
   - **Ticker/Symbol** — the stock or crypto symbol
   - **Quantity** — number of shares or coins
   - **Average cost / Cost basis** — per share/coin (if visible)
   - **Current price** — (if visible)
   - **Market value** — total value of the position
   - **Account type** — Brokerage, IRA, Roth IRA, 401k, Crypto (infer from broker name)
   - **Asset type** — stock, ETF, crypto, bond, mutual fund

3. If anything is unclear or partially visible:
   - Ask: "I can see AAPL and MSFT clearly, but the third position is cut off. Can you scroll down and share another screenshot?"
   - Never guess — if a number is ambiguous, ask.

4. Present extracted data as a table for confirmation:

```
EXTRACTED FROM: [Fidelity screenshot]

| Ticker | Qty    | Avg Cost | Current | Value    | Type   |
|--------|--------|----------|---------|----------|--------|
| AAPL   | 50     | $142.30  | $251.49 | $12,574  | Stock  |
| VTI    | 100    | $198.50  | $285.30 | $28,530  | ETF    |
| MSFT   | 25     | $310.00  | $383.00 | $9,575   | Stock  |

Total: $50,679

Does this look correct? I'll save it to your profile.
```

5. Once confirmed, write to `profile/holdings.md`.

### Method 2: Text Paste

The user copies and pastes text from their broker (e.g., a CSV export or copied table).

**Process:**
1. Parse the pasted text — look for patterns: ticker symbols, numbers, dollar amounts
2. Map columns to: ticker, quantity, cost basis, current price, value
3. Present for confirmation
4. Write to profile

### Method 3: CSV Upload

The user uploads a CSV file (many brokers offer "Export to CSV").

**Process:**
1. Read the CSV file
2. Auto-detect column mapping (headers like "Symbol", "Shares", "Cost Basis", "Market Value")
3. Parse and present for confirmation
4. Write to profile

### Method 4: Manual Entry

The user describes holdings verbally:
- "I have 50 shares of Apple, 100 VTI, and 0.5 BTC"
- Parse, confirm, save.

## Writing to Profile

After extraction and confirmation, write to `profile/holdings.md` in this format:

```markdown
# Holdings

Last updated: [date]
Import method: [Screenshot / CSV / Manual]
Sources: [Fidelity, Coinbase, Moomoo]

## Fidelity (Brokerage)
| Ticker | Shares | Avg Cost | Current Price | Value | Sector |
|--------|--------|----------|---------------|-------|--------|
| AAPL   | 50     | $142.30  | $251.49       | $12,574 | Technology |
| VTI    | 100    | $198.50  | $285.30       | $28,530 | Index ETF |

## Coinbase (Crypto)
| Ticker | Amount | Avg Cost | Current Price | Value |
|--------|--------|----------|---------------|-------|
| BTC    | 0.5    | $42,000  | $70,893       | $35,446 |
| ETH    | 5.0    | $2,800   | $3,542        | $17,710 |

## Moomoo (Trading)
| Ticker | Shares | Avg Cost | Current Price | Value | Sector |
|--------|--------|----------|---------------|-------|--------|
| NVDA   | 20     | $120.00  | $175.64       | $3,512 | Semiconductors |

## Summary
- Total portfolio value: $97,772
- Accounts: 3 (Fidelity, Coinbase, Moomoo)
- Asset allocation:
  - Stocks: 55%
  - ETFs: 29%
  - Crypto: 16%
- Sector breakdown:
  - Technology: 40%
  - Index/Broad: 29%
  - Crypto: 16%
  - Semiconductors: 15%
```

## Multi-Account Merge

When the user imports from multiple sources:
1. Append new accounts — don't overwrite existing ones
2. If the same ticker appears in multiple accounts, keep them separate (different cost bases)
3. Update the Summary section with totals across all accounts
4. Note: "This profile combines holdings from Fidelity + Coinbase + Moomoo. Total: $97,772"

## Sync to Screener

After import, offer to sync the user's tickers to the screener:
- "I see you own AAPL, VTI, MSFT, NVDA, BTC, and ETH. Want me to add these to your watchlist so you get signals for stocks you own?"
- If yes: call the screener API to add tickers to the universe

Also update `profile/goals.md` with allocation targets based on current mix:
- If they're 55% stocks / 29% ETF / 16% crypto → suggest target allocation based on their current implicit preference

## Important Notes

- **Screenshots are processed by Claude's vision — the image is NOT stored, transmitted to any third party, or saved to disk.** Claude sees it in the conversation context only.
- **Cost basis is critical for tax calculations.** If the screenshot doesn't show it, ask: "I can see your current positions but not what you paid for them. Do you have your cost basis handy? This matters for tax-loss harvesting."
- **Stale screenshots:** Note the date. "This screenshot shows prices as of [date]. If it's more than a week old, some values may have changed. Want to update with current prices?"
- **Partial imports are fine.** "I only imported your Fidelity account so far. Share your Coinbase and Moomoo when ready — I'll merge them."
