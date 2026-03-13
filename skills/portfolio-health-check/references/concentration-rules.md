# Concentration Risk Thresholds

## Single Position Limits

| Portfolio Size | Max Single Position | Rationale |
|---------------|-------------------|-----------|
| < $50k | 25% | Small portfolios need fewer positions but still diversification |
| $50k - $250k | 20% | Standard retail threshold |
| $250k - $1M | 15% | Larger portfolios should be more diversified |
| > $1M | 10% | Institutional-grade diversification |

## Alert Levels

- **Green (< threshold)**: Position within safe limits
- **Yellow (1-1.5x threshold)**: Monitor closely, consider trimming on strength
- **Red (> 1.5x threshold)**: Immediate action needed — this position controls your portfolio's fate

## Sector Concentration

- No single sector should exceed 40% of total portfolio
- Technology sector: common offender — count all tech-adjacent (semis, cloud, SaaS, AI) as one sector
- Correlated positions: NVDA + AMD + TSM + AVGO may look like 4 stocks but behave as one "AI semiconductor" bet

## Correlation Clustering

Group positions by their effective exposure:
- **AI/Semiconductor cluster**: NVDA, AMD, TSM, AVGO, MU, ASML, LRCX
- **Mega-cap tech cluster**: AAPL, MSFT, GOOGL, META, AMZN
- **EV/Energy cluster**: TSLA, RIVN, LCID, charging infrastructure
- **Bitcoin/Crypto cluster**: MSTR, COIN, Bitcoin ETFs, crypto miners
- **Gold/Commodity cluster**: GLD, IAU, GDX, mining stocks (IAG, AMXEF, etc.)
- **Defense cluster**: PLTR, LMT, RTX, NOC, GD

Total cluster exposure should not exceed 50% of portfolio.

## Herfindahl-Hirschman Index (HHI)

Calculate: Sum of (position weight %)^2 for all positions

| HHI Range | Classification |
|-----------|---------------|
| < 1,000 | Well-diversified |
| 1,000-1,800 | Moderately concentrated |
| 1,800-2,500 | Highly concentrated |
| > 2,500 | Dangerously concentrated |

Example: A portfolio with 3 equal positions of 33% each = 33^2 * 3 = 3,267 (dangerous)
Example: A portfolio with 10 equal positions of 10% each = 10^2 * 10 = 1,000 (well-diversified)

## Special Cases

### Minor/Custodial Accounts
- No single stock should exceed 25% regardless of portfolio size
- Prefer index funds (FZROX, VTI, VOO) as base
- Growth stocks acceptable but must be diversified

### Retirement Accounts (IRA, 401k)
- Apply standard concentration rules
- Factor in time horizon: more concentration acceptable if 20+ years to retirement
- Target-date funds count as diversified single positions

### Taxable vs Tax-Advantaged
- Concentration in taxable accounts has tax consequences when trimming
- Factor in unrealized gains when recommending trims
- Prefer trimming in tax-advantaged accounts first (no tax impact)
