# STORY-002 — Display Dashboard Metrics

As a business owner, I want to view dashboard metrics, so that I can monitor business performance.

**Release:** r1 · Enhanced Inventory and Customer Management (weeks 5–8)
**Owner:** Business Owner
**Blocked by:** STORY-001

## The requirement this satisfies

- **REQ-003** (Functional, must) — The system must provide a dashboard displaying today's sales, expenses, estimated profit, customer debts, and low-stock products.

## How to build it

Implement the dashboard using the existing UI framework, ensuring metrics are fetched from the analytics service.

## Failure paths you must handle

- User is not logged in
- Metrics service is unavailable
- Data returned is incomplete

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given the user is logged in, when they access the dashboard, then they see the latest metrics.
- [ ] Given the user is not logged in, when they attempt to access the dashboard, then they are prompted to log in.
- [ ] Trust: All dashboard accesses are logged for audit purposes.

When every box above is ticked, stop and show the demo.
