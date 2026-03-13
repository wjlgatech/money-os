# UI/UX Vision

## Product stance

`money-os` should not look like a brokerage terminal and should not collapse into a pure chat shell. The interface should behave like a decision workspace: conversational when the user needs help, structured when the user needs clarity, and controlled when the user needs to act.

The design goal is to make beginners feel oriented in minutes while still giving advanced users enough depth to inspect assumptions, compare scenarios, and approve actions safely.

## Design principles

### 1. Start from questions, not features

Organize the product around user questions:

- What is my situation?
- What changed?
- What matters now?
- What should I do?
- What happens if I do it?
- Am I ready to approve it?

### 2. Use progressive depth

Show a clear default view in plain language first. Let users expand into data tables, factor views, source evidence, and policy details only when they want the depth.

### 3. Keep the system's reasoning boundary visible

Always show:

- which accounts and sources were included
- which data may be stale or incomplete
- what assumptions were used
- what confidence level applies

### 4. Make action feel serious

Trades, transfers, rebalances, and automation changes must look deliberate. The UI should feel lighter for exploration and heavier for approval.

### 5. Preserve continuity

The product should remember goals, risk preferences, prior theses, previous recommendations, and user overrides. The user should feel like they are working with an ongoing financial operating system, not restarting from scratch each session.

## Interface model

The interface has four layers that can coexist on the same screen.

### 1. Command layer

The command layer is the natural-language entry point and chief commander center. It is not just a chat box. It must orchestrate the app by:

- asking questions
- expressing goals
- clarifying uncertainty
- starting workflows
- automatically opening the most relevant workspace
- highlighting the most relevant windows and tables without requiring the user to click around
- exposing action controls backed by real APIs

The command layer should always do three things at once:

1. answer the question
2. surface the right state and evidence
3. expose the next safe actions

Example prompts:

- "What should I pay attention to this week?"
- "Am I too concentrated in tech?"
- "Show me what an oil spike would do to my portfolio."
- "Build me a lower-risk 12 month plan."

### 2. Context layer

The context layer shows what the system is using to answer:

- included accounts
- included positions
- risk profile
- time horizon
- missing connectors
- stale datasets

This prevents black-box behavior and gives users a way to correct the system.

### 3. Decision canvas

The decision canvas is the core invention of the product. It is a structured workspace for one financial problem at a time.

Examples:

- Portfolio health canvas
- What changed canvas
- Rebalance canvas
- Scenario canvas
- Investment thesis canvas
- Cash flow planning canvas

Each canvas should contain:

- a one-sentence decision summary
- the current state
- the recommended action or stance
- alternatives
- downside and invalidation conditions
- confidence and uncertainty markers
- simulation and approval entry points

### 4. Control layer

The control layer contains persistent operational surfaces:

- accounts
- watchlists
- alerts
- action queue
- approvals
- automations
- settings and policies

This is where the product retains power-user depth without polluting the default experience.

## Key screens

## 1. Briefing

This is the default home screen. It is not a traditional dashboard.

Primary goals:

- orient the user fast
- highlight what changed
- show what matters now
- invite the next question or action

Core sections:

- net worth, liquidity, portfolio risk, and cash flow status
- one-line summary of what matters now
- top three items to review
- suggested actions
- ask bar for natural-language input

Example headline:

`Your portfolio is stable overall, but energy sensitivity and low cash buffer deserve attention this week.`

## 2. What Changed

This should become the habit-forming screen.

Primary goals:

- explain movement and risk shifts
- connect market events to user-specific exposure
- surface broken assumptions and new urgency

Core sections:

- balance and portfolio changes
- macro or geopolitical events affecting holdings
- stale connectors or missing data
- changed recommendations since the last review

## 3. Portfolio Health

Primary goals:

- help the user understand concentration and fragility
- translate raw holdings into understandable exposure

Core sections:

- asset allocation
- sector and geography concentration
- factor or thematic concentration
- liquidity and cash readiness
- concentration warnings and interpretation

## 4. Scenario Lab

Primary goals:

- let the user compare choices and stress events safely
- turn market fear into analyzable scenarios

Core sections:

- predefined scenarios such as oil shock, rate cut, rate spike, recession, AI rally, crypto drawdown
- custom scenario builder
- comparison panels for keep, trim, rebalance, hedge, or raise cash
- projected impact summary with assumptions

## 5. Plan Workspace

Primary goals:

- convert analysis into a concrete investment or financial plan
- track the relationship between goals and decisions

Core sections:

- goals and constraints
- current plan
- recommended changes
- decision log
- thesis tracker

## 6. Approval Center

Primary goals:

- make high-impact actions deliberate, reviewable, and safe
- centralize execution-related state

Core sections:

- pending action intents
- why each action was proposed
- policy checks
- what could go wrong
- final approval or rejection controls

## Information architecture

Recommended top-level navigation:

- Briefing
- Workspace
- Accounts
- Plans
- Approvals
- Automations

Supporting objects:

- canvases
- accounts
- recommendations
- scenarios
- intents
- approvals
- policies

The user should navigate by current task, not by internal subsystem names.

## Interaction patterns

### Ask then structure

Users should be able to type a broad request and immediately land in a structured workspace rather than remain in an endless chat thread.

### Compare, do not just recommend

Wherever possible, show:

- recommended path
- conservative alternative
- do-nothing baseline

This increases trust and teaches users how the system thinks.

### Reveal evidence on demand

Every major claim should support drill-down into:

- source holdings
- market inputs
- scenario assumptions
- policy checks

### Make memory visible

Show stored goals, risk posture, user-defined constraints, and prior thesis statements. The product should feel consistent across time.

## Onboarding flow

### Step 1. Connect or import data

Explain the immediate value in plain language: see all accounts in one place, understand exposure, and get better context-aware guidance.

### Step 2. Establish user profile

Capture:

- goals
- time horizon
- risk tolerance
- liquidity needs
- constraints and preferences

Keep this short and editable.

### Step 3. Generate the first briefing

Show:

- what was imported
- what is missing
- the first portfolio summary
- one or two clear next questions

### Step 4. Teach the canvas model

A short walkthrough should explain that chat starts work, but canvases hold the decision process.

## Desktop behavior

Desktop should use a two-panel or three-panel layout:

- left: navigation and persistent controls
- center: current decision canvas
- right: context, assumptions, evidence, and activity

Desktop is where comparison, simulation, and approval should feel strongest.

## Mobile behavior

Mobile should focus on:

- briefing
- what changed
- alerts
- quick questions
- fast approvals with strong confirmation

Complex comparison and simulation should still be available, but progressively collapsed into card stacks and step flows.

Mobile should feel like an intelligent financial briefing companion, not a shrunken desktop terminal.

## Visual design direction

The interface should feel calm, editorial, and intelligent.

Recommended qualities:

- warm neutral base with high-clarity contrast
- disciplined accent colors tied to state and risk, not decorative gradients
- typography that feels more like a serious publication than a retail trading app
- restrained motion that helps orient transitions between canvases and approval states

Avoid:

- terminal clutter
- meme-stock casino energy
- generic chatbot minimalism
- visual overload from simultaneous charts, tickers, and feeds

## Design system guidance

Component families to define early:

- briefing cards
- decision cards
- scenario comparison tables
- confidence and freshness badges
- approval steps
- policy warnings
- context drawers
- evidence timelines

State system to define early:

- normal
- stale
- degraded
- blocked
- ready for approval
- executed

## Accessibility and trust

The interface must support:

- keyboard-first navigation
- screen reader clarity for all major actions
- plain-language summaries before dense visualizations
- explicit warning language for stale or incomplete data

For trust, every recommendation should answer:

- why this matters
- what data was used
- what assumptions were made
- what could invalidate it

## North star

The product should feel like a private financial chief of staff for beginners and a disciplined investment operating desk for advanced users.

It should reduce intimidation without reducing rigor.
