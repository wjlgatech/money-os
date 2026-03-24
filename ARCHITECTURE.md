# Architecture

## Architecture goals

- Build a personal financial operating system that is explainable, auditable, and safe under uncertainty.
- Separate observation, analysis, recommendation, and execution into distinct control boundaries.
- Make every material output traceable to source data, assumptions, and policy constraints.

## High-level system

### 1. Data plane

The data plane ingests account, transaction, holding, balance, market, and event data from external providers and internal jobs. It stores append-only facts, normalized entities, reconciliation state, and freshness metadata.

Core responsibilities:

- Connector ingestion and scheduled sync
- Canonical schema normalization
- Price and metadata enrichment
- Source reconciliation and confidence scoring

### 2. Intelligence plane

The intelligence plane computes exposures, scenarios, portfolio diagnostics, and recommendation candidates. It transforms facts into structured analysis while preserving provenance.

Core responsibilities:

- Exposure and concentration analysis
- Scenario and stress testing
- Market and geopolitical impact mapping
- Recommendation and memo generation

### 3. Control plane

The control plane governs permissions, user policies, approvals, telemetry, incident handling, and rollout decisions. It decides what the system may do, not what it merely can do.

Core responsibilities:

- Policy enforcement
- Approval workflows
- Audit logging
- Alerting, rollback, and kill switches

### 4. Execution plane

The execution plane translates approved intents into provider-specific actions. It must remain isolated, explicit, and reversible where possible.

Core responsibilities:

- Broker and exchange routing
- Dry-run and pre-trade validation
- Order submission tracking
- Post-trade verification

## Repository shape (current)

- `apps/screener-api`: Next.js 15 data service — market data ingestion, trendline/scanner/signal engines, paper trading, trade gate APIs
- `apps/control-center`: Node.js dashboard prototype
- `apps/freedom-calculator`: standalone HTML calculator
- `skills/`: 20 Claude skills (markdown instruction sets)
- `skills/security-screener/`: market screening with portfolio-aware filtering
- `skills/investment-navigator/`: GPS-style investment guide with ADEPT coaching framework
- `commands/`: 21 slash command entry points
- `docs/prd/security-screener/`: Architecture, PRD, Roadmap for the screener subsystem
- `docs/strategy/`: vision, game plan, competitive landscape

## Core data model

Primary entities:

- User
- Household
- Account
- Provider connection
- Transaction
- Balance snapshot
- Position
- Instrument
- Price snapshot
- Scenario
- Recommendation
- Action intent
- Approval
- Execution event
- Audit event

Key modeling rules:

- Keep source records and normalized records linked by provenance IDs.
- Use append-only event history for material financial and control events.
- Model time explicitly with capture time, provider effective time, and processing time.
- Preserve monetary precision and currency semantics at the type level.

## Trust and safety architecture

Safety constraints:

- No implicit execution from advisory outputs.
- No production trade submission without policy validation and recorded approval state.
- Degraded data freshness must reduce functionality automatically.
- Recommendation outputs must separate facts, inferences, and actions.

Control mechanisms:

- Global kill switch for execution
- Per-provider circuit breakers
- Per-user policy limits
- Human review queues for anomalous states

## Self-aware, self-healing, self-improving infrastructure

### Self-aware

The system maintains explicit health scores for:

- Connector freshness
- Reconciliation drift
- Recommendation latency
- Recommendation quality proxies
- Approval flow failures
- Execution error rates

It should know what it knows, what it does not know, and when uncertainty is too high to act.

### Self-healing

The system attempts bounded corrective actions automatically:

- Retry transient provider failures
- Fallback to cached read-only views when live sync fails
- Quarantine bad data batches
- Disable a degraded connector or execution adapter
- Roll back or halt automation when control thresholds are crossed

### Self-improving

The system learns through controlled evaluation loops:

- Compare recommendation outcomes against explicit hypotheses
- Run offline backtests and paper-trading experiments
- Score advisor outputs against policy, quality, and user-feedback metrics
- Promote only measured improvements through staged rollout

## Delivery rules

- Keep services thin and shared packages strong.
- Prefer deterministic libraries for financial logic over hidden model behavior.
- Use feature flags and staged rollout for risky capabilities.
- Design for many small PRs with strict CI, ownership, and documentation discipline.
