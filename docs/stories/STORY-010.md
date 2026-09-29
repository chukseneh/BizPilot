# STORY-010 — Configure Automation for Debt Reminders

As a business owner, I want to configure automation for debt reminders, so that I can streamline my debt collection process.

**Release:** r4 · Messaging and Automation (weeks 17–20)
**Owner:** Business Owner
**Blocked by:** STORY-009

## The requirement this satisfies

- **REQ-017** (Functional, should) — The system must provide configurable automation for sending customer debt reminders.

## How to build it

Develop automation configuration using the 'customer_debts' and 'automation_settings' tables.

## Failure paths you must handle

- Incorrect configuration
- Unauthorized access
- Duplicate reminders
- Notification delivery failure
- Configuration error

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a debt reminder configuration, When saved, Then reminders are sent automatically based on the settings.
- [ ] Given an incorrect configuration, When saved, Then the system prompts for correction.
- [ ] Trust: All automation configurations are logged with timestamps and user IDs.

When every box above is ticked, stop and show the demo.
