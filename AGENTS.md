# AGENTS.md

Instructions for AI coding agents (Kilo Code, Cline, Claude Code, ...) working in this repository.
Humans: see README.md once it exists.

## 1. Project

Badi eSIM support ticketing module (interview assignment). Customers open and follow support tickets.
Agents triage, reply, add internal notes, assign, and change status and priority. Every important
change is audited. Customer-visible replies update live in both directions without a page refresh.

- Stack: Python / FastAPI / SQLAlchemy 2 / Alembic / PostgreSQL backend; React + TypeScript (Vite)
  frontend in `frontend/` (created in step B2).
- Sources of truth, in order: `Support_Ticketing_Interview_Assignment-1.pdf` (the requirements) >
  `plan.md` (our derived plan; "§n" means its section n) > this file. If they disagree, the docx wins:
  say so instead of silently picking one. Do not edit `plan.md` unless the user asks.
- Layout: `backend/app/{api,core,models,repositories,schemas,services,websocket}`, `backend/tests`,
  `backend/run.py`, `backend/seed.py` (step A4), `alembic/` + `alembic.ini` at the repo root,
  `requirements.txt`, `.venv/` and `.env` at the repo root (`.env` is git-ignored, `.env.example` is tracked).
- Commands:
  - API, from `backend/`: `python run.py` (checks the database, then starts uvicorn with reload).
    Database check only: `python -m app.core.db_check`.
  - Migrations, from the repo root: `python -m alembic -c alembic.ini upgrade head` and `... check`.
  - Tests, from `backend/`: `python -m pytest`.
  - Frontend, from `frontend/`: `npm run dev`, `build`, `lint`, `test`.
- Database: local PostgreSQL. Dev database `badi_support`, test database `badi_support_test`.
  Connection strings live only in `.env`. Never write credentials into tracked files, logs, docs or messages.

## 2. Rules (always apply)

1. Do ONE step at a time (see section 3). Do only what that step says; no extra features.
2. Databases: touch only `badi_support` and `badi_support_test`. Never touch any other database on the
   server. Never stop, restart or reconfigure the PostgreSQL service (it is shared with other projects).
   Simulate outages in tests instead.
3. Never commit `.env` or any secret. No `git push`, no force operations, no history rewriting.
   If `git config user.name/user.email` is not set, stop and ask; do not set it yourself.
4. Simple beats clever. The author must explain every line in a live review and make a small change on
   the spot. Prefer plain, readable code over abstractions; comment only where the reason is not obvious.
5. The backend is the single authority for permissions and business rules. The frontend only presents
   choices; it never re-implements or hides a server rule or a server error.
6. Never weaken a check, delete a test, or skip a test to make something pass. Fix the cause.
7. Re-read a file right before editing it: another agent or the user may have changed it.
8. If a step is wrong or impossible as written, stop and report instead of improvising.
9. Do not invent, summarise or edit AI transcripts. The user exports the real ones.
10. Report honestly: failing tests, skipped items and unverified claims are stated as such.

Target architecture (Part A brings the code to this; keep it this way afterwards):

- Routes are thin: validate, call one service method, return. No queries, business rules or
  `try/except` for business errors in routes.
- Services own the business rules (transition map, visibility, ownership, audit) AND the transaction:
  every mutating service method commits explicitly, once, before returning. Repositories only query
  and flush. `get_db()` rolls back on error and never commits (on FastAPI 0.141.1 its teardown runs
  after the response is sent, so it must not be relied on).
- Audit rows are append-only and written in the same transaction as the change they describe.
- Errors: domain exceptions in `app/core/exceptions.py`, mapped by ONE set of handlers to
  `{"error": {"code", "message", "details"}}`. Never leak SQL, driver text or stack traces.
- Internal notes never reach customers: filtered in `MessageService`, never broadcast over WebSocket.
- No test-only branches in production code. Tests run on real PostgreSQL (`badi_support_test`).
- Timestamps: database `now()` or timezone-aware UTC datetimes; never `datetime.utcnow()`.
- Enums are defined once and reused by models and schemas. One mapper per response type (no
  copy-pasted response builders). Eager-load relationships (no N+1 queries).

## 3. Protocol

The user names a step ("do A2", "do B3"). Then:

1. Read that step's full text in `docs/agent-tasks.md`: search for its id (for example `## A2`) and read
   only that section, not the whole file. If an item is already done, verify it and tick it; do not
   redo it.
2. Do the work. Run the step's VERIFY commands and paste the REAL output in your final message.
3. Tick the step's box in the Progress list below, only when its VERIFY passed.
4. Final message: a table of every item in the step with DONE / NOT DONE and the reason, plus the
   list of files changed. Then stop. Do not start the next step until told.

## 4. Progress (tick only after VERIFY passed)

- [x] A0 initialize working state
- [x] A1 Security
- [x] A2 Match the assignment contract
- [x] A3 Correctness and quality
- [x] A4 Submission material (no frontend)
- [ ] B1 JWT authentication (optional bonus; replaces the X-User-Id demo identity)
- [ ] B2 Frontend: initialize
- [ ] B3 Frontend: login and role-aware routing
- [ ] B4 Frontend: ticket list with filters
- [ ] B5 Frontend: ticket detail, conversation, composer
- [ ] B6 Frontend: agent controls and ticket creation
- [ ] B7 Frontend: real-time conversation
- [ ] B8 Frontend: QA, tests, submission notes

Order: A0 to A4 first, done. B1 (JWT) next - it changes deps.py, the WebSocket route and the seed
script, so the frontend (B2-B8) is built against the real login flow from the start rather than
retrofitted onto a demo-identity UI later.

## 5. Step details

The full text of every step (A0-A4 backend, B1-B8 JWT and frontend) is in `docs/agent-tasks.md`. This
file keeps only what applies to every step. Tick the boxes in section 4 of THIS file; do not tick or
edit anything in the task file unless the user asks you to change a step.
