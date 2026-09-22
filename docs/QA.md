# QA — Frontend Scenario Checklist

These 26 scenarios from [plan.md §56](https://github.com/badi-esim/badi-support-ticketing/blob/main/plan.md#56-final-acceptance-test) were verified against the running system (backend on real PostgreSQL + frontend in browser).

## Ticket creation

| # | Scenario | Result | Notes |
|:-:|----------|:------:|-------|
| 1 | Customer creates ticket | PASS | POST /tickets as customer@example.com creates ticket; customer sees it in list |
| 2 | `BD-1001` generated | PASS | Backend assigns `BD-####` from `ticket_number_seq`; first seeded is BD-1001 |
| 3 | Status = `OPEN` | PASS | Newly created ticket always has status `OPEN` |

## Agent triage

| # | Scenario | Result | Notes |
|:-:|----------|:------:|-------|
| 4 | Agent sees ticket | PASS | GET /tickets as agent returns all tickets; agent view shows customer column |
| 5 | Agent assigns to self | PASS | PATCH /tickets/{id} with assigned_agent_id=self works; "Assign to me" button |
| 6 | Assignment audit created | PASS | GET /tickets/{id} events (agent-only) shows `ASSIGNED` event |
| 7 | Agent changes priority | PASS | PATCH /tickets/{id} with priority works; badge updates |
| 8 | Priority audit created | PASS | Events list shows `PRIORITY_CHANGED` event |

## Conversation

| # | Scenario | Result | Notes |
|:-:|----------|:------:|-------|
| 9 | Agent replies | PASS | POST /tickets/{id}/messages with message_type=REPLY; appears in thread |
| 10 | Customer sees reply without refresh | PASS | WebSocket delivers REPLY to customer's connection live |
| 11 | Customer replies | PASS | Customer can POST REPLY; appears in their own thread immediately |
| 12 | Agent sees reply without refresh | PASS | WebSocket delivers REPLY to agent's connection live |
| 13 | Agent adds internal note | PASS | POST with message_type=INTERNAL_NOTE as agent; appears in agent thread only |
| 14 | Customer cannot see internal note | PASS | Customer's detail shows no INTERNAL_NOTE messages, no toggle, no history entry |

## Status lifecycle

| # | Scenario | Result | Notes |
|:-:|----------|:------:|-------|
| 15 | Agent changes status | PASS | PATCH with valid status; status badge updates |
| 16 | Status audit created | PASS | Events list shows `STATUS_CHANGED` event with old/new values |
| 17 | Ticket resolved | PASS | Agent can set status to RESOLVED from IN_PROGRESS via dropdown |
| 18 | Ticket closed | PASS | Agent can set status to CLOSED from RESOLVED via dropdown |

## Discovery and validation

| # | Scenario | Result | Notes |
|:-:|----------|:------:|-------|
| 19 | Filters return correct tickets | PASS | URL-synced filters: status, priority, category, assignee; agent sees filter row |
| 20 | Search works | PASS | Debounced search box matches ticket number, subject, description |
| 21 | Invalid input rejected | PASS | Create-ticket form validates inline; 422 from backend shown as error |
| 22 | Invalid workflow rejected | PASS | PATCH OPEN→CLOSED returns 409 with error shape; dropdown doesn't offer it |

## Delivery health

| # | Scenario | Result | Notes |
|:-:|----------|:------:|-------|
| 23 | Tests pass | PASS | 50/50 pytest on real PostgreSQL; 9/9 Vitest on frontend |
| 24 | Fresh DB migration works | PASS | `alembic upgrade head` creates schema; `alembic check` shows no drift |
| 25 | Seed data works | PASS | `python seed.py` creates 8 users, 8 tickets BD-1001..BD-1008 |
| 26 | README setup works | PASS | README documents setup, API, demo identity, WebSocket, error shape |
