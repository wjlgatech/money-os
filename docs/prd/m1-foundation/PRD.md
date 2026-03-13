# PRD: M1 Foundation and Control Plane

## Problem

The product cannot earn trust without a shared data model, explicit controls, and strong contributor discipline. Shipping user-facing features before these foundations would create a brittle fintech codebase.

## Objective

Create the platform baseline for schemas, controls, observability, CI, and architectural decision-making.

## Success criteria

- Canonical domain models exist for money, accounts, holdings, transactions, prices, and action intents.
- All material workflows emit structured audit events.
- CI enforces formatting, tests, and baseline repository integrity.
- Architecture decisions and control boundaries are documented.

## Scope

- Monorepo structure
- Shared domain package
- Controls package
- Observability package
- ADR template and docs conventions

## Out of scope

- User-facing aggregation UI
- Production trading execution
- Adaptive strategy optimization

## Requirements

- Deterministic financial types and calculations
- Provenance-first schema design
- Correlation IDs across workflows
- Kill-switch and policy primitives

## Risks

- Overengineering before real usage
- Ambiguous ownership across packages
- Control gaps hidden by early velocity pressure

## Delivery notes

Ship the minimum architecture that preserves safety and scaling headroom. Avoid speculative service sprawl.
