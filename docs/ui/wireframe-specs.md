# Wireframe Specs

## Purpose

This document defines the initial wireframe-level specifications for the first generation of `money-os` screens. These are not visual mockups. They are implementation-facing layout and interaction contracts that tie product intent to concrete UI structure.

## Global layout system

### Desktop shell

Use a three-region shell:

- left rail: navigation, account state, alerts, and shortcuts
- center canvas: current screen or decision workspace
- right rail: context, assumptions, freshness, evidence, and recent activity

Behavior rules:

- left rail is persistent
- right rail is collapsible
- canvas is the primary action area
- approval states should visually tighten focus onto the center canvas

### Mobile shell

Use a stacked card system:

- top: current financial status and urgent banner
- middle: current screen content
- bottom: primary actions and ask input

Behavior rules:

- expose context through slide-up drawers
- defer complex comparisons to step flows
- keep approvals multi-step and high-friction

## Shared components

### Ask bar

Purpose:

- act as the chief commander center for the product
- start any workflow in plain language
- answer the user's question
- auto-open the right workspace and relevant panels
- expose action controls tied to backend APIs

Elements:

- prompt input
- suggested prompts
- attach context action
- submit action
- answer region
- relevant windows region
- API action region

States:

- empty
- composing
- submitting
- blocked because required context is missing

### Freshness badge

Purpose:

- show whether analysis is current enough to trust

States:

- current
- delayed
- stale
- degraded

### Confidence block

Purpose:

- summarize confidence and uncertainty without pretending to know too much

Elements:

- confidence label
- explanation line
- show assumptions action

### Decision card

Purpose:

- package one recommendation or alternative

Elements:

- title
- why this matters
- expected benefit
- downside
- invalidation conditions
- actions: simulate, compare, save, approve

### Policy warning

Purpose:

- block or caution a user before risky actions

Elements:

- severity
- violated rule or concern
- resolution guidance

## Screen specs

## 1. Briefing

### User goal

Understand current financial posture and what deserves attention now.

### Desktop wireframe

- left rail
  - main navigation
  - account sync status
  - alerts summary
- center top
  - page title: `Briefing`
  - one-line situation summary
  - ask bar
- center body row 1
  - net worth card
  - liquidity card
  - risk posture card
  - cash flow card
- center body row 2
  - `What changed` panel
  - `Suggested actions` panel
- center body row 3
  - `Top three items to review` list
- right rail
  - included accounts
  - missing data
  - freshness
  - confidence

### Primary actions

- ask a question
- open what changed
- open a suggested action
- inspect included accounts

### Empty state

- explain value of connecting accounts
- offer import and demo data options

## 2. What Changed

### User goal

Understand what changed in portfolio state, account health, and external context since the last review.

### Desktop wireframe

- center top
  - date range switcher
  - summary sentence
- center body
  - changes timeline
  - portfolio impact cards
  - macro and geopolitical relevance cards
  - data quality change cards
- right rail
  - affected accounts
  - affected holdings
  - assumptions and sources

### Primary actions

- compare to previous period
- open affected holding
- open related scenario
- convert a change into a plan or action

## 3. Portfolio Health

### User goal

See concentration, fragility, liquidity, and major exposures quickly.

### Desktop wireframe

- center top
  - summary stance
  - risk posture selector
- center body row 1
  - allocation overview
  - concentration view
- center body row 2
  - sector exposure
  - geography exposure
  - thematic or factor exposure
- center body row 3
  - liquidity readiness
  - warnings and interpretations
- right rail
  - included positions
  - stale pricing notices
  - evidence and assumptions

### Primary actions

- drill into exposure
- simulate rebalance
- create a plan
- save a thesis note

## 4. Scenario Lab

### User goal

Compare how current portfolio and candidate actions behave under defined scenarios.

### Desktop wireframe

- center top
  - scenario selector
  - custom scenario builder
- center body row 1
  - current portfolio baseline
  - recommended path
  - conservative alternative
  - do nothing baseline
- center body row 2
  - impact comparison table
  - assumptions panel
- center body row 3
  - next action cards
- right rail
  - scenario details
  - holdings most affected
  - confidence and caveats

### Primary actions

- adjust scenario
- compare strategies
- export analysis to plan
- propose action intent

## 5. Plan Workspace

### User goal

Turn insight into an explicit financial or investment plan.

### Desktop wireframe

- center top
  - plan name
  - objective
  - status
- center body row 1
  - goals and constraints
  - current posture
- center body row 2
  - recommended changes
  - alternatives
- center body row 3
  - decision log
  - thesis tracker
- right rail
  - assumptions
  - linked accounts
  - linked scenarios

### Primary actions

- edit constraints
- accept recommendation
- reject with reason
- send selected items to approvals

## 6. Approval Center

### User goal

Review and approve high-impact actions safely.

### Desktop wireframe

- center top
  - pending approvals count
  - blocking warnings
- center body
  - action intent queue
  - selected intent detail view
  - policy validation panel
  - pre-trade or pre-action simulation
  - final approve or reject section
- right rail
  - audit trail
  - linked recommendation
  - provider status

### Primary actions

- review intent
- inspect policy checks
- approve
- reject
- request more information

### Approval rules

- always show irreversible consequences
- always show what data was used
- always show what can invalidate the action
- require explicit confirmation on mobile

## 7. Accounts

### User goal

Understand connected sources and their reliability.

### Desktop wireframe

- center top
  - connected providers
  - add account action
- center body
  - provider list with sync status
  - account table
  - import history
- right rail
  - data freshness
  - reconciliation issues
  - permissions and scopes

### Primary actions

- connect provider
- import file
- retry sync
- inspect missing data

## 8. Automations

### User goal

Control what the system monitors and what it may do automatically.

### Desktop wireframe

- center top
  - automation status summary
  - safe mode toggle
- center body
  - automation cards
  - trigger conditions
  - actions and approval requirements
- right rail
  - recent automation activity
  - blocked executions
  - policy logs

### Primary actions

- create automation
- pause automation
- edit thresholds
- inspect past runs

## Screen-level build notes

For each screen implementation:

- wire the screen to real backend contracts, not mock-only local state
- provide a demo data path only if clearly marked
- expose freshness and error states in the UI
- include at least one end-to-end user path in automated tests
