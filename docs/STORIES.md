# BizPilot Nigeria — Stories

14 stories across 5 releases, walking-skeleton first:
the earliest release proves the thinnest end-to-end path including the trust
spine, and later releases stack features on top of something already working.

## Before the releases — start here

- **[STORY-000](stories/STORY-000.md)** — Build your Command Center

The first thing you build, on day one, before any part of the system itself. It is
the page you keep open for the rest of the programme and demo from. It belongs to no
release and fulfils none of your requirements, because it is the window onto your
system rather than a part of it.

## r0 · Foundation and Core Features — weeks 1–4

**Goal:** Establish core transaction recording and dashboard functionality with secure data handling.
**Done when you can show:** Record a transaction via text and display it on the dashboard with validated data stored in PostgreSQL.

- **[STORY-001](stories/STORY-001.md)** — Record Transaction via Text
- **[STORY-011](stories/STORY-011.md)** — Ensure Tenant Isolation for Business Data
- **[STORY-012](stories/STORY-012.md)** — Log AI Actions for Audit
- **[STORY-013](stories/STORY-013.md)** — Provide Mobile-First Responsive UI
- **[STORY-014](stories/STORY-014.md)** — Perform Financial Calculations Server-Side

## r1 · Enhanced Inventory and Customer Management — weeks 5–8

**Goal:** Introduce inventory management and customer debt features.
**Done when you can show:** Manage inventory levels and send customer debt reminders with AI assistance.

- **[STORY-002](stories/STORY-002.md)** — Display Dashboard Metrics _(waits on STORY-001)_
- **[STORY-003](stories/STORY-003.md)** — Manage Inventory Levels _(waits on STORY-002)_
- **[STORY-004](stories/STORY-004.md)** — Send Customer Debt Reminders _(waits on STORY-002)_

## r2 · AI Business Insights and Voice Entry — weeks 9–12

**Goal:** Enable AI-driven business insights and voice transaction entry.
**Done when you can show:** Query AI for business insights and record a transaction via voice input.

- **[STORY-005](stories/STORY-005.md)** — Query AI for Business Insights _(waits on STORY-004)_
- **[STORY-006](stories/STORY-006.md)** — Record Transaction via Voice _(waits on STORY-004)_

## r3 · AI Business Manager and Daily Briefings — weeks 13–16

**Goal:** Implement AI Business Manager and daily business briefings.
**Done when you can show:** Receive a daily business briefing with AI-generated insights and recommendations.

- **[STORY-007](stories/STORY-007.md)** — Receive AI Daily Business Briefing _(waits on STORY-006)_
- **[STORY-008](stories/STORY-008.md)** — Implement AI Business Manager Tools _(waits on STORY-007)_

## r4 · Messaging and Automation — weeks 17–20

**Goal:** Integrate WhatsApp messaging and introduce automation for debt reminders.
**Done when you can show:** Send automated debt reminders via WhatsApp and configure automation settings.

- **[STORY-009](stories/STORY-009.md)** — Send Notifications via WhatsApp _(waits on STORY-008)_
- **[STORY-010](stories/STORY-010.md)** — Configure Automation for Debt Reminders _(waits on STORY-009)_
