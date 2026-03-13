# Freedom Number Mathematics

## Core Formulas

### Freedom Number (Monthly Passive Income Target)
```
Lean Freedom    = Monthly Essentials × 1.0
Comfortable     = Monthly Essentials × 1.3
Rich Freedom    = Monthly Essentials × 1.6
```

### Freedom Portfolio (Required Assets)
```
Freedom Portfolio = (Freedom Number × 12) / Safe Withdrawal Rate
```

Safe Withdrawal Rates by timeline:
| Years in Freedom | SWR | Rationale |
|-----------------|-----|-----------|
| 50+ years (retire at 30-40) | 3.0% | Ultra-conservative, sequence risk |
| 40 years (retire at 40-50) | 3.25% | Conservative FIRE |
| 30 years (retire at 50-60) | 3.5% | Standard early retirement |
| 25 years (traditional) | 4.0% | Classic "4% rule" (Trinity Study) |
| 20 years | 4.5% | Later retirement |

### Time to Freedom
```
FV = PV × (1+r)^n + PMT × ((1+r)^n - 1) / r

Solve for n:
n = ln((FV × r + PMT) / (PV × r + PMT)) / ln(1 + r)

Where:
FV = Freedom Portfolio target
PV = Current portfolio value
PMT = Monthly investment amount
r = Monthly return rate (annual / 12)
```

### Passive Income Calculation
```
Dividend Income = Sum(shares × annual dividend per share) for each holding
Interest Income = cash_balances × APY
Rental Income = gross rent - expenses - vacancy allowance
Total Passive = Dividend + Interest + Rental + Other

Freedom Progress = Total Passive Monthly / Freedom Number × 100
```

## Monte Carlo Simulation Parameters

### Return Distributions (Monthly)
| Asset Class | Mean Annual | Std Dev Annual | Monthly Mean | Monthly Std |
|------------|-------------|----------------|-------------|-------------|
| US Large Cap | 10.0% | 18.0% | 0.80% | 5.20% |
| US Small Cap | 11.5% | 22.0% | 0.91% | 6.35% |
| International | 8.0% | 20.0% | 0.64% | 5.77% |
| US Bonds | 5.0% | 6.0% | 0.41% | 1.73% |
| REITs | 9.0% | 20.0% | 0.72% | 5.77% |
| Cash/HYSA | 4.0% | 0.5% | 0.33% | 0.14% |

### Inflation Model
- Mean: 3.0% annual
- Std Dev: 1.5%
- Floor: 0.5%
- Use log-normal distribution

### Income Growth Model
- Base: 3% annual (inflation match)
- Career bump: additional 2-5% for first 15 years
- Model: step function with random variation

### Simulation Logic
```python
# Pseudocode for Monte Carlo
for sim in range(10000):
    portfolio = current_portfolio
    passive_income = current_passive
    for year in range(max_years):
        # Generate random return from distribution
        annual_return = random_normal(mean_return, std_return)
        # Apply return
        portfolio = portfolio * (1 + annual_return)
        # Add annual savings (growing with income growth)
        savings = annual_savings * (1 + income_growth)^year
        portfolio += savings
        # Calculate passive income at current portfolio
        passive_income = portfolio * withdrawal_rate / 12
        # Check if freedom achieved
        if passive_income >= freedom_number_inflation_adjusted:
            record_freedom_year(year)
            break
    # Adjust freedom number for inflation
    freedom_number_adjusted = freedom_number * (1 + inflation)^year
```

### Sequence-of-Returns Risk
The order of returns matters enormously in early freedom years. Model:
- First 5 years after freedom: use worst-case historical sequences
- Show the "danger zone": years 1-5 of freedom where bad returns + withdrawals compound
- Mitigation: 2-3 year cash buffer at freedom date

## Acceleration Lever Calculations

### Roth IRA Max ($7,000/yr)
```
20-year value at 10%: $7,000 × ((1.10^20 - 1) / 0.10) = $441,735
Tax savings: $441,735 × 0 (no tax on Roth withdrawals) vs. Traditional
Net acceleration: varies by bracket, but typically 2-5 years off freedom timeline
```

### Mega Backdoor Roth ($36,500/yr additional)
```
20-year value at 10%: $36,500 × ((1.10^20 - 1) / 0.10) = $2,302,825
This alone, at 3.5% SWR, generates $6,717/month in tax-free income
For most people, this single lever can cut freedom timeline by 5-10 years
```

### Tax Alpha ($3,000/yr reinvested)
```
Annual tax savings reinvested over 20 years at 10%:
$3,000 × ((1.10^20 - 1) / 0.10) = $189,295
Additional passive income: $189,295 × 3.5% / 12 = $552/month
```

### Savings Rate Impact
```
Savings Rate → Years to Freedom (at 10% return, starting from $0):
10%: 51 years
20%: 37 years
30%: 28 years
40%: 22 years
50%: 17 years
60%: 13 years
70%: 9 years
80%: 6 years

Each 10% increase in savings rate is roughly a 5-8 year acceleration.
```

## Social Security Modeling

For users 40+, include as supplementary:
- Estimate from SSA.gov or user-provided statement
- Model at 3 levels: 100%, 75% (projected shortfall), 50% (worst case)
- Don't count on it before 62, and ideally model as bonus income
- Delaying from 62 to 70 increases benefit by ~76%
- For freedom planning: model "freedom with SS" and "freedom without SS"
