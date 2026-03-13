# Money OS: Security & Trust Architecture

## Trust Model

Money OS operates on a **zero-trust, local-only** architecture. Your financial data never leaves your computer.

### How It Works

```
┌─────────────────────────────────────────────┐
│            YOUR COMPUTER                     │
│                                              │
│  ┌──────────┐    ┌──────────────────────┐   │
│  │ Claude /  │    │  Money OS Plugin     │   │
│  │ Cowork    │◄──►│  (skills + commands) │   │
│  └──────────┘    └──────────────────────┘   │
│       │                    │                 │
│       ▼                    ▼                 │
│  ┌──────────┐    ┌──────────────────────┐   │
│  │ Your     │    │  profile/            │   │
│  │ Messages │    │  (financial data)    │   │
│  └──────────┘    └──────────────────────┘   │
│                                              │
│  ────────── NOTHING CROSSES THIS LINE ────── │
└─────────────────────────────────────────────┘
         │
         ✖ No external APIs
         ✖ No cloud storage
         ✖ No analytics/telemetry
         ✖ No account creation
```

### Security Guarantees

1. **Local-only data storage.** All financial profile data (holdings, tax brackets, goals, history) is stored as plaintext markdown files in your workspace folder. No database, no cloud sync, no server.

2. **Zero network calls.** Money OS makes zero HTTP requests to external services. Web search may be used for general financial research (market data, tax rules) but never transmits your personal financial data.

3. **No third-party dependencies.** Every skill is first-party code — markdown instructions and reference documents. No npm packages, no Python libraries, no compiled binaries that could contain supply-chain attacks.

4. **No account required.** No sign-up, no API keys, no OAuth. Install the plugin and start using it.

5. **Human approval gates.** Every recommendation includes a "verify this" step. No financial action is taken automatically — you approve each decision.

6. **Full auditability.** Your profile/history.md logs every recommendation made and decision taken. You can review, modify, or delete any entry.

## Data Classification

| Data Type | Storage | Access | Retention |
|-----------|---------|--------|-----------|
| Financial identity (tax bracket, filing status) | profile/financial-identity.md | Read by all skills | Until you delete it |
| Holdings (portfolio positions) | profile/holdings.md | Read by portfolio/tax skills | Until you update it |
| Goals (Freedom Number, targets) | profile/goals.md | Read by all skills | Until you modify it |
| History (decisions, recommendations) | profile/history.md | Append-only by skills | Until you clear it |
| Conversation content | Claude's context window | Current session only | Cleared at session end |
| Web search queries | Claude's search tool | General research only | Not stored locally |

## What Money OS CAN See

- Whatever you share in conversation (holdings, income, goals)
- Files in your workspace folder that you grant access to
- Public web data (market prices, tax rules, general financial information)

## What Money OS CANNOT See

- Your bank accounts, brokerage logins, or any authenticated financial accounts
- Files outside your designated workspace folder
- Other people's financial data
- Your browsing history, passwords, or system data

## Disclaimer Framework

Every skill output includes one of these disclaimers based on the type of analysis:

**Analytical output:**
> "This is analytical framework output, not financial advice. Verify all calculations independently."

**Tax-related output:**
> "This is tax analysis based on general rules. Tax situations are individual — consult a CPA or tax professional before acting."

**Emotional support output:**
> "This is emotional support and analytical framework, not therapy or financial advice."

**Investment-related output:**
> "Past performance and projections do not guarantee future results. This is not a recommendation to buy or sell securities."

## Security Audit Checklist

Run this before each release:

- [ ] **No network calls**: grep all SKILL.md files — zero references to external APIs or endpoints
- [ ] **No secrets**: grep for API keys, tokens, passwords, account numbers — zero matches
- [ ] **No third-party code**: plugin contains only .md and .json files — no executable code
- [ ] **Disclaimers present**: every skill's output format includes an appropriate disclaimer
- [ ] **PII scrubbed**: git diff shows zero personal names, addresses, account numbers
- [ ] **Profile exclusion**: .gitignore excludes profile/ directory and personal data files
- [ ] **Approval gates**: every skill that recommends action includes "verify this" language

## Responsible AI Use

Money OS is designed to augment your financial decision-making, not replace professional advice.

**When to use Money OS:**
- Portfolio analysis and optimization modeling
- Tax strategy exploration and scenario planning
- Cash flow analysis and surplus routing
- Financial education and concept learning
- Emotional support for financial anxiety
- Quick calculations and "what-if" modeling

**When to consult a professional:**
- Tax filing and compliance (use a CPA)
- Estate planning and trusts (use an estate attorney)
- Insurance coverage decisions (use a licensed agent)
- Legal questions about investments (use a securities attorney)
- Complex equity compensation (RSU/ISO/ESPP tax planning — use a CPA with equity comp experience)
- Mental health concerns beyond financial anxiety (use a therapist)
