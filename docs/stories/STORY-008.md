# STORY-008 — Implement AI Business Manager Tools

As a business owner, I want AI to manage business tools, so that I can automate routine tasks.

**Release:** r3 · AI Business Manager and Daily Briefings (weeks 13–16)
**Owner:** Business Owner
**Blocked by:** STORY-007

## The requirement this satisfies

- **REQ-007** (Functional, must) — The system must allow users to query AI for business insights using actual database data.

## How to build it

Implement AI tool integration using the Anthropic Claude API and 'business_tools' table.

## Failure paths you must handle

- AI tool execution error
- Data retrieval error
- Unauthorized tool access
- Incorrect task execution
- Data inconsistency

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a business task, When AI tools are used, Then the task is completed using actual data.
- [ ] Given insufficient data for a task, When AI tools are used, Then it informs the user of the data gap.
- [ ] Trust: All AI tool actions are logged with timestamps and user IDs.

When every box above is ticked, stop and show the demo.
