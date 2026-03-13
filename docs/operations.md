# Operations

## Objective

Operate `money-os` as a trustworthy financial control system, not a generic web app. The platform must detect degraded states early, reduce scope automatically, recover safely, and generate evidence for every major decision path.

## Self-aware infrastructure

The platform should continuously measure:

- Connector freshness by provider and account
- Reconciliation drift between normalized state and source state
- Data pipeline latency and error budgets
- Recommendation generation latency and failure modes
- Policy-check pass and fail rates
- Execution adapter health and confirmation lag
- User trust signals such as ignored recommendations, reversed actions, and complaint rates

Required implementation layers:

- Structured logs with correlation IDs
- Metrics and distributed traces
- Health score computation by subsystem
- Event-driven audit ledger
- Review dashboards and alert routing

## Self-healing infrastructure

Automatic remediation should be bounded and observable.

Examples:

- Retry transient failures with capped budgets
- Move provider sync jobs into degraded read-only mode on repeated failures
- Disable a connector after drift exceeds threshold
- Block recommendations that depend on stale or inconsistent data
- Prevent execution if approval state, freshness state, or policy state is invalid

Required implementation layers:

- Circuit breakers
- Rate limiting and bulkheads
- Provider-specific fallback handlers
- Dead-letter queues and replay tooling
- Rollback and kill-switch controls

## Self-improving infrastructure

Improvement must be evidence-based rather than autonomous guesswork.

Examples:

- Evaluate recommendation variants offline before user exposure
- Compare paper-trade results to benchmark and baseline policies
- Score explanations for clarity, consistency, and alignment with policy
- Promote improvements only after measured gains and safety review

Required implementation layers:

- Experiment registry
- Offline evaluation runners
- Policy-aware simulation environment
- Recommendation quality scorecards
- Human sign-off for model or strategy promotion

## Operational modes

- Normal: full read-only aggregation and advisory features available
- Degraded: stale or partial data available, automation restricted, user notified
- Safe mode: no new recommendations or execution, historical views only
- Recovery: replay, reconcile, review, and re-enable subsystems in stages

## Non-negotiable controls

- Audit every recommendation and every action intent
- Keep execution isolated from experimentation
- Require explicit approvals for high-impact actions
- Preserve immutable evidence for incident review
