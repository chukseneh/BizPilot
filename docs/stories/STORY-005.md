# STORY-005 — Query AI for Business Insights

As a business owner, I want to query AI for business insights, so that I can make informed decisions.

**Release:** r2 · AI Business Insights and Voice Entry (weeks 9–12)
**Owner:** Business Owner
**Blocked by:** STORY-004

## The requirement this satisfies

- **REQ-007** (Functional, must) — The system must allow users to query AI for business insights using actual database data.

## How to build it

Integrate AI query handling using the Anthropic Claude API and 'analytics' table.

## Failure paths you must handle

- AI response delay
- Data retrieval error
- Unauthorized query
- Incorrect insights
- Data inconsistency

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a business query, When the AI is queried, Then it provides insights based on actual data.
- [ ] Given insufficient data for a query, When the AI is queried, Then it informs the user of the data gap.
- [ ] Trust: All AI queries and responses are logged with timestamps and user IDs.

When every box above is ticked, stop and show the demo.
