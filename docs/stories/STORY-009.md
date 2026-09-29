# STORY-009 — Send Notifications via WhatsApp

As a business user, I want to send notifications via WhatsApp, so that I can keep customers informed through their preferred messaging platform.

**Release:** r4 · Messaging and Automation (weeks 17–20)
**Owner:** Business User
**Blocked by:** STORY-008

## The requirement this satisfies

- **REQ-013** (Constraint, must) — The system must use WhatsApp Business API for messaging integration.
- **REQ-008** (Safety, must) — The system must ensure tenant isolation for all business data records.

## How to build it

Implement WhatsApp messaging using the existing notification service. Ensure tenant isolation by tagging messages with tenant IDs in the logs.

## Failure paths you must handle

- WhatsApp API failure
- Invalid customer phone number
- Message content exceeds limit

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a customer with a registered WhatsApp number, when a notification is triggered, then the system sends a WhatsApp message to the customer.
- [ ] Given a customer without a registered WhatsApp number, when a notification is triggered, then the system logs a failure to send the message.
- [ ] Trust: All sent messages are logged with tenant isolation for audit purposes.

When every box above is ticked, stop and show the demo.
