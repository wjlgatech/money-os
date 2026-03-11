# Architecture Notes

## Design constraints

- Start read-only for external account integrations.
- Normalize all positions, balances, and transactions into explicit schemas.
- Make every advisory output traceable to inputs and assumptions.
- Keep execution workflows isolated from research workflows.

## Target platform shape

- `apps/control-center`: user-facing financial dashboard and planning interface
- `apps/advisor-api`: orchestration and policy engine
- `packages/domain`: shared financial schemas and business rules
- `packages/controls`: guardrails, approvals, and audit logging primitives
- `packages/connectors`: broker, exchange, banking, and payment integrations
