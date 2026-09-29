# STORY-003 — Manage Inventory Levels

As a business owner, I want to manage my inventory levels, so that I can ensure stock availability and profitability.

**Release:** r1 · Enhanced Inventory and Customer Management (weeks 5–8)
**Owner:** Business Owner
**Blocked by:** STORY-002

## The requirement this satisfies

- **REQ-006** (Functional, must) — The system must provide inventory management with details on product quantity, buying price, selling price, profit margin, reorder level, and supplier.

## How to build it

Implement inventory tracking and alerts using the 'inventory_movements' and 'products' tables.

## Failure paths you must handle

- Incorrect stock levels
- Database update failure
- Alert misconfiguration
- Unauthorized access
- Data inconsistency

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a product inventory, When a sale is recorded, Then the inventory level is updated accordingly.
- [ ] Given a low-stock alert, When the inventory is checked, Then the system suggests reorder actions.
- [ ] Trust: Inventory changes are logged with timestamps and user IDs.

When every box above is ticked, stop and show the demo.
