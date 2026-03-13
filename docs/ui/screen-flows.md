# Screen Flows

## Purpose

This document defines screen-by-screen user flows for the first product slices. Each flow should become both an implementation checklist and an end-to-end test target.

## Flow 1: First-run onboarding to first briefing

### User story

A new user wants to understand their financial position without learning a complex brokerage interface.

### Flow

1. User opens the app and sees a simple introduction screen.
2. User chooses `Connect accounts` or `Use sample workspace`.
3. User connects or imports at least one source.
4. User sets goals, time horizon, liquidity needs, and risk posture.
5. System processes available data and marks anything missing or stale.
6. User lands on `Briefing`.
7. System explains what it knows, what it does not know, and one or two recommended next questions.

### Required backend/frontend integration

- provider connection or sample data load
- user profile persistence
- account ingestion status
- briefing API

### Required end-user test

- new user can reach a meaningful `Briefing` in one session
- stale or missing data is visible

## Flow 2: Briefing to What Changed to Scenario Lab

### User story

A user sees an alert that market conditions changed and wants to understand impact before acting.

### Flow

1. User opens `Briefing`.
2. User sees a `What changed` summary card.
3. User opens `What Changed`.
4. User reviews portfolio movement, external events, and affected holdings.
5. User selects `Run scenario`.
6. User lands in `Scenario Lab` with relevant scenario preloaded.
7. User compares baseline, recommended path, and conservative alternative.

### Required backend/frontend integration

- change detection service
- event-to-portfolio mapping
- scenario computation API
- scenario comparison rendering

### Required end-user test

- user can follow one change from summary to scenario comparison without developer tools

## Flow 3: Portfolio Health to Plan Workspace

### User story

A user suspects they are overexposed and wants a concrete plan rather than just a warning.

### Flow

1. User opens `Portfolio Health`.
2. User sees concentration and liquidity warnings.
3. User selects `Create plan`.
4. System opens `Plan Workspace` with current posture and proposed changes.
5. User edits constraints such as target cash or max concentration.
6. System refreshes recommendations.
7. User saves the plan.

### Required backend/frontend integration

- exposure analytics API
- plan creation API
- editable user constraints
- recommendation refresh logic

### Required end-user test

- user can edit constraints and see the plan update

## Flow 4: Ask bar to structured workspace

### User story

A user prefers natural language but still needs a concrete interface to inspect and act.

### Flow

1. User types a question into the ask bar.
2. System interprets the request and chooses a workspace type.
3. System opens the relevant screen or decision canvas.
4. System shows included context, assumptions, and confidence.
5. User drills into evidence or chooses a suggested action.

### Required backend/frontend integration

- prompt interpretation endpoint
- workspace routing contract
- context payload generation
- evidence retrieval

### Required end-user test

- one plain-language question opens a structured workspace with visible assumptions

## Flow 5: Plan Workspace to Approval Center

### User story

A user agrees with a proposed plan and wants to move to controlled action.

### Flow

1. User opens `Plan Workspace`.
2. User selects one or more recommended changes.
3. System converts selections into action intents.
4. User lands in `Approval Center`.
5. User reviews policy warnings, simulations, and consequences.
6. User approves or rejects each intent.

### Required backend/frontend integration

- intent creation API
- policy validation API
- simulation API
- approval persistence

### Required end-user test

- user can move from plan to approval with full visibility into checks and risks

## Flow 6: Accounts reliability flow

### User story

A user wants to know whether the system is missing important data before trusting a recommendation.

### Flow

1. User opens `Accounts`.
2. User sees one provider marked `stale`.
3. User opens provider details.
4. System explains what data may be affected.
5. User retries sync or excludes the source from analysis.
6. System updates freshness and downstream warnings.

### Required backend/frontend integration

- sync status API
- retry sync endpoint
- source exclusion setting
- downstream warning refresh

### Required end-user test

- user can see why trust is reduced and take corrective action

## Flow 7: Automation review flow

### User story

A user wants the system to monitor conditions automatically without giving away control.

### Flow

1. User opens `Automations`.
2. User creates an automation with a trigger, action, and approval rule.
3. System validates policy compatibility.
4. User saves the automation.
5. On trigger, system creates a recommendation or action intent.
6. User receives a notification and reviews outcome.

### Required backend/frontend integration

- automation create and edit APIs
- trigger evaluation
- policy enforcement
- notification or inbox surface

### Required end-user test

- user can create an automation that produces a visible result without unsafe execution

## Acceptance rule for every flow

No flow is complete unless:

- backend state persists correctly
- frontend renders current state, loading, error, and degraded modes
- automated end-to-end coverage exists for the primary path
- one human can execute the flow without developer explanation
