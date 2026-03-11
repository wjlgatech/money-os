# money-os

`money-os` is an open source personal finance and investing operating system.

The project goal is to help users understand their full financial picture, map market and macro events to their portfolio, generate disciplined investment plans, and add guarded execution workflows over time.

## Principles

- Default to user safety, explicit assumptions, and auditability.
- Separate facts, inferences, and opinions in every decision flow.
- Treat automation as assisted execution with human approval gates.
- Optimize for reproducible analysis, not hype or false certainty.
- Build for multi-contributor velocity without weakening controls.

## Planned product areas

- Account aggregation and normalized financial data
- Portfolio analytics and exposure monitoring
- Market, macro, and geopolitical context mapping
- Research memos, scenario analysis, and thesis tracking
- Paper trading, backtesting, and policy-constrained automation

## Repository layout

- `apps/`: end-user applications and services
- `packages/`: shared libraries, schemas, and SDKs
- `docs/`: architecture, ADRs, controls, and product specs

## Working agreement

- Open issues before large changes.
- Keep pull requests small and reviewable.
- Add tests for behavior changes.
- Document security-sensitive design decisions.

## Initial roadmap

1. Define the domain model for accounts, holdings, cash flow, and risk.
2. Stand up a monorepo with typed shared packages.
3. Implement read-only aggregation and portfolio visibility first.
4. Add advisory workflows before any execution workflows.
5. Add execution only with strong guardrails, approvals, and audit trails.
