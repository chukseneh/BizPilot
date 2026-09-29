# STORY-004 — Send Customer Debt Reminders

As a business owner, I want to send reminders to customers with overdue debts, so that I can improve cash flow.

**Release:** r1 · Enhanced Inventory and Customer Management (weeks 5–8)
**Owner:** Business Owner
**Blocked by:** STORY-002

## The requirement this satisfies

- **REQ-009** (Functional, must) — The system must provide customer debt management with reminders for overdue payments.

## How to build it

Develop the reminder system using the 'customer_debts' and 'notifications' tables.

## Failure paths you must handle

- Notification delivery failure
- Incorrect debt calculation
- Unauthorized access
- Duplicate reminders
- Configuration error

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a list of overdue debts, When reminders are sent, Then customers receive notifications via the chosen channel.
- [ ] Given a debt below the reminder threshold, When reminders are sent, Then no notification is sent for that debt.
- [ ] Trust: All reminder actions are logged with timestamps and user IDs.

When every box above is ticked, stop and show the demo.
