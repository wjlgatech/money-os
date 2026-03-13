# Feature Delivery Contract

## Purpose

This document defines what counts as a finished feature in `money-os`. The goal is to prevent partial delivery where backend code exists without usable UI, UI exists without real data, or flows work only for developers.

## Definition of done

A feature is not done unless all of the following are true:

1. The backend contract exists and is exercised by the feature.
2. The frontend is connected to real backend responses for the primary path.
3. Loading, empty, error, stale, and degraded states are represented in the UI.
4. The feature is covered by automated tests at the unit and end-to-end levels where appropriate.
5. The feature has been exercised as an end user would use it.
6. The user can test it without developer-only setup knowledge.

## Required build sequence for significant features

### 1. Product contract

Before implementation:

- define user goal
- define screen entry point
- define backend inputs and outputs
- define trust, freshness, and policy states

### 2. Backend slice

Implement:

- domain model changes
- service or route contract
- validation and policy checks
- observability hooks

### 3. Frontend slice

Implement:

- actual screen or component
- request and response wiring
- loading and failure states
- user-readable warnings and confidence states

### 4. End-to-end test slice

Implement:

- automated path from entry point to successful outcome
- automated path for at least one degraded or blocked state

### 5. Human test slice

Run the feature as a user would:

- open the app
- perform the flow without manual DB edits or hidden scripts
- verify copy, behavior, and confidence cues make sense

Only after this should the user be invited to test it personally.

## Required test levels

### Unit

- financial calculations
- policy logic
- state transitions
- formatter and parser behavior

### Integration

- API contract behavior
- connector or ingestion boundaries
- persistence and retrieval correctness

### End-to-end

- entry screen to desired outcome
- degraded state handling
- blocked approval handling for risky actions

## Test data rules

- prefer stable fixtures and seed flows over ad hoc local mutations
- preserve representative beginner and advanced-user scenarios
- include stale and incomplete data cases
- include high-risk action cases

## User handoff rule

When a feature is ready for user testing, ask the user to test it as a normal user, not as a developer.

That means:

- give a starting URL or clear entry screen
- describe the task in plain language
- describe expected visible outcomes
- avoid requiring terminal commands unless the feature is explicitly developer-facing

## Release quality bar

For any feature touching financial guidance, plans, approvals, or execution:

- separate facts, inferences, and actions in UI copy
- preserve audit events
- expose stale data clearly
- block unsafe execution paths by default
