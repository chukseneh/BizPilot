# STORY-014 — Perform Financial Calculations Server-Side

As a financial analyst, I want all financial calculations to be performed server-side, so that I can ensure accuracy and security of financial data.

**Release:** r0 · Foundation and Core Features (weeks 1–4)
**Owner:** Financial Analyst
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

- **REQ-015** (Safety, must) — The system must ensure all financial calculations are performed server-side.

## How to build it

Implement server-side logic for financial calculations. Ensure client-side requests are redirected to the server.

## Failure paths you must handle

- Server-side calculation error
- Unauthorized client-side calculation attempt
- Calculation logging failure

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a financial transaction, when calculations are required, then the system performs them server-side and returns the result.
- [ ] Given a client-side calculation request, when the request is made, then the system denies it and logs the attempt.
- [ ] Trust: All financial calculations are logged with transaction IDs for audit purposes.

When every box above is ticked, stop and show the demo.
