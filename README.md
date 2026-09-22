# Badi eSIM Support Ticketing

A small support ticketing module for Badi eSIM: customers open and follow support
cases; support agents triage, reply, add internal notes, assign, and change status and
priority; every important change is recorded in an audit trail; customer-visible
replies update live, in both directions, without a page refresh.

This is the backend for the Badi eSIM Full Stack Developer interview assignment
(`Support_Ticketing_Interview_Assignment-1.pdf`). `plan.md` is the implementation plan
derived from it; `AGENTS.md` and `docs/agent-tasks.md` record the working plan used
while building and reviewing this codebase with AI coding assistants.

> **Version control note:** this repository was written iteratively across several AI
> coding sessions before being placed under Git, so its commit history starts from one
> baseline reflecting the working state at that point, grouped afterward into a small
> number of logical commits by concern (setup, models, services, API, tests, docs) for
> reviewability - it is not a literal replay of the original session-by-session history.
> See `docs/ai-transcripts/` for the real session records.

> **Frontend:** not built yet. Everything below is the backend API, reachable directly
> with `curl`/Postman or through the interactive docs at `/docs`. See the *Frontend*
> section near the end.

## Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running the API](#running-the-api)
- [The demo identity (there is no login yet)](#the-demo-identity-there-is-no-login-yet)
- [API](#api)
- [Realtime (WebSocket)](#realtime-websocket)
- [Errors](#errors)
- [Tests](#tests)
- [Design decisions, assumptions and trade-offs](#design-decisions-assumptions-and-trade-offs)
- [Known limitations](#known-limitations)
- [What I would improve with more time](#what-i-would-improve-with-more-time)
- [Frontend](#frontend)

## Prerequisites

- Python 3.13+ (developed and tested on 3.14)
- PostgreSQL, running locally and reachable (developed and tested on PostgreSQL 18)
- A shell (examples below are given for both bash and PowerShell)

## Setup

```bash
# 1. Virtual environment and dependencies
python -m venv .venv
# bash:
source .venv/Scripts/activate      # Windows Git Bash / WSL: source .venv/bin/activate
# PowerShell:
.venv\Scripts\Activate.ps1

pip install -r requirements.txt

# 2. Configuration
cp .env.example .env
# edit .env if your PostgreSQL user/password/host differ from the default
# (postgres/root@localhost:5432) - see .env.example for every variable.

# 3. Databases (two: one for the app, one dedicated to the test suite)
psql -U postgres -c "CREATE DATABASE badi_support;"
psql -U postgres -c "CREATE DATABASE badi_support_test;"

# 4. Schema (from the repository root - alembic.ini lives here, not in backend/)
python -m alembic -c alembic.ini upgrade head

# 5. Demo data (from backend/)
cd backend
python seed.py
```

`python seed.py` only runs if `badi_support` has no users yet; pass `--reset` to wipe
its 4 data tables and reseed (never touches any other database). It prints the seeded
users' ids at the end - you will need one of those ids for the `X-User-Id` header
described below.

## Running the API

From `backend/`:

```bash
python run.py
```

This checks the database first and only starts `uvicorn` (with auto-reload) if it is
reachable; if it is not, it prints a specific, readable reason (wrong password, database
does not exist, server not running, ...) instead of a stack trace, and does not start.
The API then listens on `http://127.0.0.1:8000` (`PORT` in `.env` to change it).
Interactive API docs: `http://127.0.0.1:8000/docs`.

If you run `uvicorn app.main:app --reload` directly instead, do it from `backend/` (the
`app` package lives there) - the same startup database check runs from `app.main`'s own
lifespan either way.

## The demo identity (there is no login yet)

Authentication is out of scope for this assignment (see *Design decisions* below).
Every request identifies its caller with an `X-User-Id` header naming a seeded user's
id:

```bash
curl http://127.0.0.1:8000/tickets -H "X-User-Id: 1"    # 1 = Anas, an agent (after seeding)
```

- No header, a non-numeric value, or an id that does not exist -> `401`.
- `GET /users/demo` lists every seeded user (id, name, e-mail, role) with **no**
  authentication, so you do not have to look the ids up by hand. It only exists while
  `DEMO_MODE=true` (the default); set it to `false` and the endpoint disappears (`404`)
  in an environment where seeded users should not be enumerable to anyone.

## API

Base URL: `http://127.0.0.1:8000` (no version prefix).

| Method | Path | Who | Notes |
|---|---|---|---|
| `POST` | `/tickets` | customer, agent | A customer may only use their own `customer_email`; an agent may create on behalf of any customer. |
| `GET` | `/tickets` | customer, agent | A customer only ever sees their own tickets. Filters below. |
| `GET` | `/tickets/{id}` | customer, agent | A customer gets `404` (not `403`) for a ticket that is not theirs - see *Design decisions*. |
| `PATCH` | `/tickets/{id}` | agent | `status`, `priority`, `assigned_agent_id` (send `null` to unassign) - any combination, only changed fields are audited. |
| `POST` | `/tickets/{id}/messages` | customer, agent | `message_type` in the body: `REPLY` (either role) or `INTERNAL_NOTE` (agent only). |
| `WS` | `/tickets/{id}/ws?user_id=<id>` | customer, agent | See *Realtime* below. |
| `GET` | `/mock/orders/{order_id}` | anyone | Read-only, no auth (`ORD-10293`, `ORD-10294`, `ORD-10295` are seeded). |
| `GET` | `/users?role=AGENT\|CUSTOMER` | agent | For an assignee dropdown. |
| `GET` | `/users/demo` | anyone, while `DEMO_MODE=true` | See above. |
| `GET` | `/health` | anyone | `{"status":"ok","database":"up"}`, or `503` with `"degraded"/"down"`. |

`GET /tickets` query parameters: `status`, `priority`, `category`, `assigned_agent_id`,
`search` (matches ticket number, subject or description), `page` (default 1),
`page_size` (default 20, max 100).

Enums: status `OPEN · IN_PROGRESS · WAITING_FOR_CUSTOMER · WAITING_FOR_PROVIDER ·
RESOLVED · CLOSED`; priority `LOW · MEDIUM · HIGH · URGENT`; category `INSTALLATION ·
ACTIVATION · CONNECTIVITY · ORDER · TOPUP · REFUND · OTHER`. Status transitions are
restricted to a fixed map (`OPEN -> IN_PROGRESS`, etc.); anything else is `409`.

## Realtime (WebSocket)

Connect to `ws://127.0.0.1:8000/tickets/{id}/ws?user_id=<id>` (same demo identity as
the HTTP API; a browser cannot set a custom header on a WebSocket handshake, so the id
travels in the query string here instead). An unknown user, or a ticket that user may
not access, closes the connection immediately with code `1008`.

Every `REPLY` message posted to a ticket is pushed to every connection open on that
ticket, sender included, as soon as it is saved:

```json
{
  "event": "message.created",
  "ticket_id": 1,
  "message": { "id": 10, "ticket_id": 1, "sender_id": 2, "sender_name": "...",
               "message_type": "REPLY", "body": "...", "created_at": "..." }
}
```

An `INTERNAL_NOTE` is never broadcast, to anyone, under any circumstance - the manager
that fans a message out to connections has no notion of roles, so the messages route
only ever calls it for `REPLY`.

## Errors

Every error response has the same shape:

```json
{ "error": { "code": "INVALID_STATUS_TRANSITION", "message": "A ticket cannot move from OPEN to CLOSED.",
             "details": { "from": "OPEN", "to": "CLOSED" } } }
```

`code` is a stable, machine-readable identifier a client can branch on (for example
`NOT_AUTHENTICATED`, `FORBIDDEN`, `TICKET_NOT_FOUND`, `AGENT_NOT_FOUND`,
`INVALID_STATUS_TRANSITION`, `CUSTOMER_EMAIL_IS_AGENT`, `VALIDATION_ERROR`,
`DATABASE_UNAVAILABLE`). No response ever includes a raw SQL statement, driver message,
or stack trace - unexpected errors are logged server-side and answered with a generic
message instead.

## Tests

Tests run against a **real PostgreSQL database**, never SQLite - the ticket-number
sequence, timestamptz columns and the migration's own constraints only behave exactly
as they do in production on PostgreSQL itself. `DATABASE_URL` must point at a database
whose name ends in `_test` before pytest starts; the suite refuses to even collect a
test otherwise, so it can never be pointed at `badi_support` by mistake.

```bash
# bash, from the repository root:
DATABASE_URL=postgresql+psycopg://postgres:root@localhost:5432/badi_support_test \
    python -m pytest backend/tests -q

# PowerShell:
$env:DATABASE_URL = "postgresql+psycopg://postgres:root@localhost:5432/badi_support_test"
python -m pytest backend/tests -q
```

The suite builds the schema by actually running `alembic upgrade head` once per
session (never `create_all()`), then truncates the 4 data tables and restarts
`ticket_number_seq` before every test. It covers, among other things: ticket creation
(a `BD-` number, status `OPEN`, and the row surviving in a brand new session); a status
change writing the matching audit row; 20 concurrent ticket creations producing 20
distinct numbers; foreign-key and unique-constraint violations; every status-transition
and authorization rule in the table above; a real two-connection WebSocket exchange
proving a reply reaches the other party live and an internal note reaches no one; and a
simulated database outage answering `503`.

## Design decisions, assumptions and trade-offs

| Decision | Why |
|---|---|
| Authentication: an `X-User-Id` demo identity, no passwords | Out of scope for this assignment (docx: "Full authentication is not required"). Role-sensitive rules are still enforced at the service layer regardless of how the caller was identified. |
| A customer gets `404`, not `403`, for another customer's ticket | So the response does not itself confirm that ticket id exists. The same reasoning applies to messaging: posting to a ticket that is not yours is also `404`. |
| Ticket numbers from a PostgreSQL sequence (`ticket_number_seq`), not a counted row or a UUID | `nextval()` is atomic and is never rolled back, so two concurrent requests can never receive the same number - verified directly under 20 concurrent creates in the test suite. |
| "Find or create the customer" by `customer_email` on ticket creation | The assignment allows an agent to create a ticket for a customer who may not exist yet as a user. An e-mail that already belongs to an agent is rejected (`409 CUSTOMER_EMAIL_IS_AGENT`) rather than silently mixing roles. |
| The status-transition map lives only in `TicketService.VALID_TRANSITIONS` | The frontend (once built) would only ever present the transitions this map allows, but the backend is the actual authority - a direct API call cannot bypass it. |
| Every ticket/audit-affecting write commits once, explicitly, inside the service method, before the response is built | `get_db()` intentionally never commits on its own: on this FastAPI version its teardown runs *after* the HTTP response is already sent, so relying on it could answer `201` for a write that then failed to persist. |
| Internal notes are enforced at the service layer and never reach the WebSocket manager | "Never shown to the customer" has to be a backend guarantee, not a frontend filter, to actually mean anything. |
| WebSocket manager: in-process, one Python dict of connections | Enough for a single server process and this assignment's scope. A second server process would need a shared broadcaster (for example Redis pub/sub) instead - noted below as a future improvement, not built here. |
| Audit trail is agent-only | The docx does not ask for customer-visible history, and the seeded conversation examples treat it as an internal tool. |

## Known limitations

- No authentication, no passwords, no sessions - see *Design decisions* above. Anyone
  who can reach the API and knows (or guesses) a user id can act as that user. This is
  acceptable for a local/demo deployment of this assignment, not for anything public.
- `GET /users` (used for the assignee dropdown) returns an empty list rather than a
  clear `403` for a non-agent caller who somehow reaches it - functionally harmless
  (nothing is exposed), but the error would be clearer as a proper `403`.
- The WebSocket connection manager holds state in the process's memory - it does not
  survive a restart, and does not fan out across more than one server process.
- No pagination on `GET /users` (fine at this data size; would need it at a much larger
  one).
- No rate limiting on any endpoint.

## What I would improve with more time

- A lightweight, optional authentication layer (JWT + hashed passwords) behind the same
  service-layer authorization that already exists, so the demo identity becomes
  something closer to production-shaped without having to change any business rule.
- Redis pub/sub behind the WebSocket manager, so realtime updates work across more than
  one server process.
- Full-text search instead of the current `ILIKE` substring match, once ticket volume
  would make that matter.
- File attachments on messages.
- SLA/overdue indicators on tickets (age since creation vs. priority).
- Structured logging and basic request metrics.
- The React + TypeScript frontend described in the assignment (see below).

## Frontend

The frontend is built with React + TypeScript + Vite and lives in `frontend/`.

### Setup

```bash
cd frontend
npm install
cp .env.example .env    # sets VITE_API_BASE_URL (default: http://127.0.0.1:8000)
```

### Running

```bash
npm run dev     # dev server on http://localhost:5173
npm run build   # production build to frontend/dist
npm run lint    # oxlint
npm test        # vitest (9 tests, React Testing Library + jsdom)
```

### Demo identity

There is no real authentication. The frontend uses the backend's demo identity:
- Pick a user on `/choose-identity` (backed by `GET /users/demo`, no auth)
- The chosen user's id is sent as `X-User-Id` on every API request
- "Switch identity" in the top bar clears the session and returns to the picker
- A notice on the picker page states plainly that this is a demo mechanism

### Data flow

Pages → hooks → `api/` modules → backend. `useIdentity` holds the current user;
`useTickets` handles list loading/filtering; `useTicketSocket` manages the
WebSocket connection; `Toast` provides aria-live notices.

### Routes

| Route | Page |
|---|---|
| `/choose-identity` | Demo identity picker |
| `/tickets` | Ticket list with URL-synced filters |
| `/tickets/new` | Create ticket form |
| `/tickets/:id` | Ticket detail, conversation, agent controls |

### Trade-offs

- **sessionStorage** for identity (cleared when tab closes; no localStorage pollution)
- **No state library** — React state + URL query params only
- **In-process WebSocket** — same as backend; no Redis pub/sub
- **Debounced search** (300 ms) on the list page
- Agent-only controls (status/priority/assignee/history) are conditionally rendered; the backend is the authority on permissions
