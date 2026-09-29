# STORY-006 — Record Transaction via Voice

As a business owner, I want to record transactions via voice, so that I can update records hands-free.

**Release:** r2 · AI Business Insights and Voice Entry (weeks 9–12)
**Owner:** Business Owner
**Blocked by:** STORY-004

## The requirement this satisfies

- **REQ-016** (Functional, should) — The system must support voice transaction entry using a speech-to-text provider.

## How to build it

Implement voice-to-text processing and transaction validation using a speech-to-text provider.

## Failure paths you must handle

- Speech recognition error
- Database connection failure
- Validation error
- Duplicate transaction
- Unauthorized access

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a voice input for a transaction, When the input is processed, Then the transaction is recorded in the database.
- [ ] Given an unclear voice input, When the input is processed, Then the system prompts for clarification.
- [ ] Trust: Voice transactions are logged with timestamps and user IDs.

When every box above is ticked, stop and show the demo.
