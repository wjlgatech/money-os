---
description: Analyze a tax return for missed deductions and credits
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch
argument-hint: [upload tax return or paste details]
---

Run the tax-return-analyzer skill on the user's tax return or tax documents.

Accept input in any format: PDF upload, screenshots, pasted text, or verbal description.

Execute all 6 analysis phases:
1. Income completeness check
2. Deduction optimization (standard vs itemized, above/below the line)
3. Credit scan (all applicable credits)
4. Filing status optimization
5. Investment income analysis (cost basis, wash sales, QSBS, foreign tax credit)
6. Forward-looking recommendations

Produce a scored report with estimated dollar impact for each finding.
Flag any RSU/ESPP cost basis issues with high priority — this is the #1 source of overpayment.

End with specific actions and deadlines for the current and next tax year.

$ARGUMENTS
