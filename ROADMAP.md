# Roadmap

## Product milestones

### M1. Foundation and control plane

Goal: establish the canonical financial domain model, monorepo standards, and the observability and control-plane primitives required for a high-trust fintech system.

Deliverables:

- Canonical schemas for accounts, balances, transactions, positions, prices, and policy intents
- Core repository standards, CI, linting, testing, ADR workflow, and release conventions
- Baseline telemetry, audit logging, and incident surfaces

PRD:

- [docs/prd/m1-foundation/PRD.md](docs/prd/m1-foundation/PRD.md)

### M2. Read-only financial aggregation

Goal: give users a unified and trustworthy picture of their finances before any advisory or execution features.

Deliverables:

- Connectors and import paths for broker, exchange, and payment accounts
- Unified account and holdings views
- Reconciliation, freshness, and source-confidence indicators

PRD:

- [docs/prd/m2-aggregation/PRD.md](docs/prd/m2-aggregation/PRD.md)

### M3. Portfolio intelligence and advisor

Goal: translate raw financial data and macro context into understandable portfolio intelligence and disciplined investment planning.

Deliverables:

- Exposure analysis and scenario views
- Personalized market and geopolitical impact summaries
- Investment memos, action plans, and thesis tracking

PRD:

- [docs/prd/m3-advisor/PRD.md](docs/prd/m3-advisor/PRD.md)

### M4. Guarded execution and approvals

Goal: let users act on advice safely with strong approval workflows, policy enforcement, and provider isolation.

Deliverables:

- Trade and rebalance intents
- Human approval gates and policy constraints
- Execution adapters and audit trails

PRD:

- [docs/prd/m4-execution/PRD.md](docs/prd/m4-execution/PRD.md)

### M5. Learning system and continuous improvement

Goal: improve outcomes through simulation, evaluation, and controlled iteration without turning the product into an opaque autopilot.

Deliverables:

- Paper trading and backtesting framework
- Decision quality evaluation loops
- Controlled strategy experimentation and improvement workflows

PRD:

- [docs/prd/m5-learning/PRD.md](docs/prd/m5-learning/PRD.md)

## Cross-cutting tracks

- Security and privacy
- Controls and auditability
- Data quality and reconciliation
- Developer experience and contributor throughput
- Operational resilience and incident response

## Milestone sequencing

1. Finish M1 before significant product implementation.
2. Ship M2 before personalized advisory.
3. Ship M3 before any production execution.
4. Gate M4 behind policy, approvals, and simulation maturity.
5. Treat M5 as disciplined optimization, not speculative autonomy.
