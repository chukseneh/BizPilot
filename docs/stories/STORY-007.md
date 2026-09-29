# STORY-007 — Receive AI Daily Business Briefing

As a business owner, I want to receive a daily business briefing, so that I can stay informed about my business performance.

**Release:** r3 · AI Business Manager and Daily Briefings (weeks 13–16)
**Owner:** Business Owner
**Blocked by:** STORY-006

## The requirement this satisfies

- **REQ-014** (Functional, must) — The system must provide AI-driven daily business briefings to users.

## How to build it

Develop the daily briefing system using the 'analytics' and 'notifications' tables.

## Failure paths you must handle

- Data retrieval error
- Incorrect calculations
- Notification delivery failure
- Unauthorized access
- Outdated data

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a new day, When the briefing is generated, Then it includes sales, profit, and debt information.
- [ ] Given incomplete data, When the briefing is generated, Then it highlights missing information.
- [ ] Trust: Briefing generation is logged with timestamps and user IDs.

When every box above is ticked, stop and show the demo.
