# BizPilot Nigeria — Requirements

An AI-powered operating system for small Nigerian businesses, focusing on deterministic financial calculations and AI-driven insights.

This is the source of truth for what you are building. Your Claude Code prompts
point here. If you sharpen a requirement, edit it — your version is the real one.

| Kind | Meaning |
|---|---|
| Functional | something the system does |
| Safety | a guardrail, with a check that enforces it |
| Reliability | how it behaves when something fails |
| Constraint | a technology or vendor you must use — context, not a task |

## AI Business Manager

### REQ-007 — Functional · must

The system must allow users to query AI for business insights using actual database data.

Fulfilled by: STORY-005, STORY-008

### REQ-014 — Functional · must

The system must provide AI-driven daily business briefings to users.

Fulfilled by: STORY-007

## AI Integration

### REQ-005 — Constraint

The system must use the Anthropic Claude API for AI functionalities.

Context for the stories that use it — constraints do not get their own story.

## Architecture

### REQ-004 — Constraint

The system must use PostgreSQL as the database for storing business data.

Context for the stories that use it — constraints do not get their own story.

### REQ-011 — Constraint

The system must support multi-tenant architecture.

Context for the stories that use it — constraints do not get their own story.

## Audit

### REQ-010 — Safety · must

The system must log all AI actions for audit purposes.

Fulfilled by: STORY-012

## Customer Debt Management

### REQ-009 — Functional · must

The system must provide customer debt management with reminders for overdue payments.

Fulfilled by: STORY-004

### REQ-017 — Functional · should

The system must provide configurable automation for sending customer debt reminders.

Fulfilled by: STORY-010

## Dashboard

### REQ-003 — Functional · must

The system must provide a dashboard displaying today's sales, expenses, estimated profit, customer debts, and low-stock products.

Fulfilled by: STORY-002

## Inventory Management

### REQ-006 — Functional · must

The system must provide inventory management with details on product quantity, buying price, selling price, profit margin, reorder level, and supplier.

Fulfilled by: STORY-003

### REQ-018 — Functional · should

The system must provide AI-driven inventory recommendations based on sales data.

_Not yet fulfilled by any story._

## Messaging

### REQ-013 — Constraint

The system must use WhatsApp Business API for messaging integration.

Fulfilled by: STORY-009

## Security

### REQ-008 — Safety · must

The system must ensure tenant isolation for all business data records.

Fulfilled by: STORY-009, STORY-011

### REQ-015 — Safety · must

The system must ensure all financial calculations are performed server-side.

Fulfilled by: STORY-014

## Transaction Recording

### REQ-001 — Functional · must

The system must allow users to record transactions via text, voice, or manual form.

Fulfilled by: STORY-001

### REQ-002 — Functional · must

The system must validate structured transaction data before writing to the database.

Fulfilled by: STORY-001

### REQ-016 — Functional · should

The system must support voice transaction entry using a speech-to-text provider.

Fulfilled by: STORY-006

## User Interface

### REQ-012 — Non-functional · must

The system must provide a mobile-first responsive UI.

Fulfilled by: STORY-013
