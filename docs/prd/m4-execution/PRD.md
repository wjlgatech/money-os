# PRD: M4 Guarded Execution and Approvals

## Problem

Advice without action can be useful, but users eventually want help turning plans into approved, safe, and trackable execution workflows.

## Objective

Introduce policy-constrained action intents, approvals, and provider execution adapters.

## Success criteria

- Users can review and approve proposed actions before submission.
- Policy limits are enforced consistently.
- Execution state and post-action verification are visible and auditable.

## Scope

- Action intent model
- Approval workflows
- Broker and exchange execution adapters
- Audit trails and post-trade reconciliation

## Out of scope

- Fully autonomous unrestricted trading
- Strategy generation based solely on live production experimentation

## Requirements

- Dry-run simulation before execution
- Explicit user or policy approval state
- Provider-specific error handling and rollback behavior
- Global and per-provider kill switches

## Risks

- Compliance and liability exposure
- Provider API inconsistency
- Trust loss from silent execution or poor confirmations

## Delivery notes

Execution should be the most constrained subsystem in the product.
