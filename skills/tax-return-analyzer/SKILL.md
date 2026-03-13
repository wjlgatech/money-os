---
name: tax-return-analyzer
description: >
  Analyze a tax return (1040, W-2, 1099s, K-1s) to find missed deductions, credits, and
  optimization opportunities. Use when the user says "review my tax return", "analyze my taxes",
  "did I miss any deductions", "check my 1040", "am I overpaying taxes", "review my W-2",
  "help with my tax return", "what deductions am I missing", "tax return review", or uploads
  a tax return, W-2, 1099, or other tax document.
version: 0.1.0
---

# Tax Return Analyzer

Review tax returns and supporting documents to identify missed deductions, credits,
filing optimizations, and forward-looking strategies. This is the "second opinion"
that most people never get.

## What This Does That TurboTax Doesn't

TurboTax asks you what deductions you HAVE. This skill finds deductions you MISSED.

TurboTax optimizes within the forms. This skill questions whether you're using the
RIGHT forms, RIGHT filing status, and RIGHT strategies in the first place.

## Input Acceptance

Accept tax documents in any format:
- PDF of filed 1040, schedules, and attachments
- Screenshots of tax return pages
- W-2 data (pasted or uploaded)
- 1099 forms (1099-B, 1099-DIV, 1099-INT, 1099-NEC, 1099-MISC)
- K-1 forms (partnership/S-corp income)
- Brokerage tax statements
- User-provided income and deduction summary

## Analysis Framework

### Phase 1: Income Completeness Check

Verify all income sources are reported:
- W-2 wages (check multiple employers, state allocations)
- Investment income (1099-B, 1099-DIV, 1099-INT)
- Self-employment income (1099-NEC, Schedule C)
- Rental income (Schedule E)
- Partnership/S-corp income (K-1)
- Retirement distributions (1099-R)
- Social Security benefits (SSA-1099)
- State tax refunds (1099-G, if itemized previous year)
- Cryptocurrency (if applicable)
- RSU/stock option income (verify correct basis reported)

Flag: any income type that seems likely based on their profile but isn't reported.

### Phase 2: Deduction Optimization

Read `references/commonly-missed-deductions.md` for the full checklist.

**Standard vs Itemized Decision:**
- Calculate total potential itemized deductions
- Compare to standard deduction ($15,000 single / $30,000 MFJ for 2025)
- Check if bunching strategy would help in alternating years
- Check if they're leaving money on the table with either choice

**Above-the-Line Deductions (everyone gets these):**
- HSA contributions
- Student loan interest ($2,500 max)
- Educator expenses ($300)
- Self-employment tax deduction (50%)
- Self-employment health insurance
- Traditional IRA contributions (if eligible for deduction)
- Alimony payments (pre-2019 agreements only)

**Below-the-Line Deductions (itemizers only):**
- SALT (capped at $10,000)
- Mortgage interest (up to $750k acquisition debt)
- Charitable contributions (verify proper documentation)
- Medical expenses (exceeding 7.5% of AGI)
- Casualty and theft losses (federally declared disasters only)

### Phase 3: Credit Scan

Credits are MORE valuable than deductions (dollar-for-dollar reduction in tax).

Run through every applicable credit:
- Child Tax Credit ($2,000 per qualifying child)
- Child and Dependent Care Credit (up to $1,050 / $2,100)
- Earned Income Tax Credit (up to $8,046 with 3+ children)
- American Opportunity Tax Credit ($2,500 per student, partially refundable)
- Lifetime Learning Credit ($2,000 max)
- Saver's Credit (retirement contributions for lower income)
- Residential Clean Energy Credit (30% of solar, battery, etc.)
- Electric Vehicle Credit ($7,500 new / $4,000 used)
- Foreign Tax Credit (for international investments)
- Adoption Credit ($17,280 for 2025)
- Premium Tax Credit (ACA marketplace insurance)

### Phase 4: Filing Status Optimization

Verify optimal filing status:
- Married Filing Jointly vs Separately (MFS saves money when one spouse has high medical expenses, income-driven student loan repayments, or liability concerns)
- Head of Household eligibility (better brackets than single)
- Qualifying Surviving Spouse (2 years after death, with dependent)

### Phase 5: Investment Income Analysis

If the return includes investment income:
- Verify cost basis accuracy on stock sales (brokerages often report wrong basis for RSUs, options, ESPP)
- Check for missed wash sales
- Verify qualified dividend treatment is being applied
- Check if capital loss carryforward from previous years is being used
- Verify foreign tax credit is claimed on international investments
- Check for Section 1202 QSBS exclusion eligibility
- Verify 1099-B entries match actual transactions

### Phase 6: Forward-Looking Recommendations

Based on the return analysis, identify:
- Strategies to implement before next filing
- Quarterly estimated tax payment adjustments needed
- Withholding changes (W-4 updates)
- Account contribution recommendations (maximize 401k, IRA, HSA)
- Roth conversion opportunities
- Tax-loss harvesting plan for current year investments

## Output Format

```
TAX RETURN ANALYSIS — [Tax Year]

FILING STATUS: [Status] ✅ Optimal / ⚠️ Consider [Alternative]
TOTAL INCOME: $XXX,XXX
TOTAL TAX PAID: $XX,XXX
EFFECTIVE TAX RATE: XX.X%
MARGINAL RATE: XX%

FINDINGS:

🔴 CRITICAL (likely money left on table):
1. [Finding with estimated dollar impact]

🟡 OPPORTUNITIES (worth investigating):
2. [Finding with estimated impact]

🟢 CONFIRMED CORRECT:
3. [Items verified as properly claimed]

FORWARD-LOOKING ACTIONS:
- [Specific action for next tax year with deadline]

ESTIMATED POTENTIAL SAVINGS: $X,XXX — $XX,XXX
```

## Profile Integration

Before starting analysis, check for the user's financial profile:

1. Read `profile/financial-identity.md` for filing status, age, state, and other identity details (to contextualize findings)

If profile exists:
- Use stored identity details to avoid re-asking for basic tax situation context
- Flag any changes from profile (new income source, state change, etc.)
- Reference profile in comparing current vs. prior tax situations

If analyzing a return and new details emerge:
- Ask if they want to update their financial identity with new information discovered
- Note: do not store specific return details in profile for privacy (only update identity/structure info)

After completing analysis, append a summary to `profile/history.md`:
```
## [Date] — Tax Return Analysis
- **Action**: [Tax year reviewed, type of analysis]
- **Key findings**: [Most important missed opportunity, tax bracket confirmed, filing status assessment]
- **Recommendations**: [Top action to implement before next tax year, key deductions/credits to track]
```

## Important Notes

- NEVER claim certainty about tax outcomes — always frame as "potential" or "worth investigating with your tax professional"
- Tax returns contain highly sensitive PII — do not store, cache, or reference specific dollar amounts beyond the current conversation
- If the return shows complexity beyond basic analysis (S-corp, trust, estate, international income), recommend a CPA
- Always recommend the user verify findings with a qualified tax professional before amending returns
- State tax analysis is OUT OF SCOPE unless specifically requested (too much variation)
- Disclaimer: "This is tax return analysis, not tax advice. Always verify findings with a qualified tax professional before amending returns."
