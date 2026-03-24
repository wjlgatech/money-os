# Signal Types Reference

## Technical Indicators

### RSI (Relative Strength Index)
- Period: 14 bars
- Method: Wilder's exponential smoothing
- Range: 0 to 100
- **Oversold** (< 30): The stock has been selling off heavily. Not a guarantee of bounce — but if the stock is near support AND oversold, the probability of a reversal increases.
- **Overbought** (> 70): The stock has been bought heavily. Not a guarantee of pullback — but if approaching resistance AND overbought, caution is warranted.

### MACD (Moving Average Convergence Divergence)
- Parameters: Fast EMA(12), Slow EMA(26), Signal EMA(9)
- **Bullish crossover**: MACD line crosses above signal line — momentum shifting upward
- **Bearish crossover**: MACD line crosses below signal line — momentum shifting downward
- Most reliable when confirmed by price action near a trendline

### Divergence
- **Bullish divergence**: Price makes a lower low, but RSI makes a higher low. The selling is losing steam even though price dropped further. Hidden buyers are accumulating.
- **Bearish divergence**: Price makes a higher high, but RSI makes a lower high. The buying is losing steam even though price rose further. Distribution is happening.
- Divergence signals are stronger on weekly timeframe than daily.

### Proximity
- **Within 1×ATR of a trendline**: Price is approaching a decision point. The trendline will either hold (bounce) or break (continuation in direction of the break).
- ATR is adjusted by VIX: in high-volatility environments, the proximity zone widens.

## Zone Classification

### Entry Zone (distance ≤ 1.0 × adjusted ATR)
Price is close enough to a trendline that a position entry is technically justified.
- **VIX adjustment**: adjustedATR = ATR × (VIX / 20)
- At VIX = 20 (normal): zones are standard width
- At VIX = 40 (panic): zones double in width — prevents premature entries in volatile markets

### Alert Zone (1.0 < distance ≤ 1.5 × adjusted ATR)
Price is approaching but not yet at a key level. Early warning — do research now, act later.

### Signal Types
- **TL (Trendline)**: Price near a single-timeframe trendline
- **IX (Intersection)**: Weekly and daily trendlines converge within 0.5×ATR — higher confidence than a single trendline signal
