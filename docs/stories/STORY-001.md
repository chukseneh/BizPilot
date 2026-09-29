# STORY-001 — Record Transaction via Text

As a business owner, I want to record transactions via text, so that I can easily update my business records.

**Release:** r0 · Foundation and Core Features (weeks 1–4)
**Owner:** Business Owner
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

- **REQ-001** (Functional, must) — The system must allow users to record transactions via text, voice, or manual form.
- **REQ-002** (Functional, must) — The system must validate structured transaction data before writing to the database.

## How to build it

Implement text input processing and validation for transactions, storing results in the 'transactions' table.

## Failure paths you must handle

- Invalid text format
- Database connection failure
- Validation error
- Duplicate transaction
- Unauthorized access

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a text input for a transaction, When the text is submitted, Then the transaction is recorded in the database.
- [ ] Given an invalid transaction text, When the text is submitted, Then the system prompts for correction.
- [ ] Trust: The transaction is logged with a timestamp and user ID.

When every box above is ticked, stop and show the demo.
