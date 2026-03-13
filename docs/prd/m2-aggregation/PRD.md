# PRD: M2 Read-only Financial Aggregation

## Problem

Users have fragmented visibility across brokers, exchanges, payment apps, and spending accounts. They cannot make good decisions if the system does not first unify and explain their financial state.

## Objective

Build trustworthy read-only aggregation and unified portfolio visibility.

## Success criteria

- A user can connect or import multiple financial sources.
- The platform shows balances, holdings, transactions, and freshness state in one view.
- Reconciliation status is visible and degraded states are handled safely.

## Scope

- Provider connection model
- Read-only ingestion pipelines
- Unified balances and holdings views
- Freshness and confidence indicators
- Manual import fallback paths

## Out of scope

- Trade execution
- Personalized investment advice beyond descriptive analytics

## Requirements

- Support heterogeneous asset types including equities, ETFs, options visibility, crypto, and cash
- Preserve source provenance
- Surface missing or stale data explicitly
- Handle partial provider failures without corrupting user state

## Risks

- Connector fragility
- Inconsistent source schemas
- False user confidence when data is incomplete

## Delivery notes

Bias toward correctness, transparency, and manual reconciliation over aggressive automation.
