# Agent task list

Full text of every step listed in the Progress section of [AGENTS.md](../AGENTS.md).
The rules, target architecture and protocol in AGENTS.md apply to every step here.

# Part A - Backend

## A0 - Restore a working state

- A0.1 Commits. `TicketService.create_ticket`, `update_ticket` and `add_message` commit explicitly before
  returning (repositories flush only; `get_db` keeps rollback-on-exception and has no implicit commit).
  Do not rely on teardown: on FastAPI 0.141.1 the `get_db` teardown runs AFTER the response is sent and
  after BackgroundTasks, so a failed commit would still have answered 201, and a follow-up request or a
  WebSocket broadcast could run before the row exists. Tests: a NEW session sees the row when the handler
  returns; a monkeypatched commit that raises gives an error response, not 201.
- A0.2 Every test authenticates as a real user (X-User-Id until B1, tokens after) through ONE fixture.
  Do not weaken the authentication dependency to make tests pass.
- A0.3 WebSocket route: use `deps.get_current_user_ws` (fail-closed). No first-user fallback, no commit
  in the route. Unknown user, or a ticket the user may not access: close with code 1008. Close the DB
  session before the receive loop (do not pin a connection for the socket's lifetime). The dependencies
  in `deps.py` are plain `def`: blocking SQLAlchemy calls inside `async def` block the event loop.

## A1 - Security (§4, §52.3)

- A1.1 `create_ticket` requires `creator`. A CUSTOMER whose `customer_email` differs from their own
  (case-insensitive) gets Forbidden. Agents may use any customer e-mail.
- A1.2 `get_ticket_detail` returns audit events to agents only. For a CUSTOMER return `events=[]` and do
  not query them.
- A1.3 Message visibility is an allow-list: only AGENT sees or creates INTERNAL_NOTE. One guard, in
  `MessageService` (remove the duplicate in `ticket_service.add_message`); compare with `UserRole`,
  not string literals.

## A2 - Match the assignment contract

- A2.1 Paths exactly as the docx, no `/api/v1` prefix: `POST /tickets`, `GET /tickets`,
  `GET /tickets/{id}`, `PATCH /tickets/{id}`, `POST /tickets/{id}/messages`,
  `GET /mock/orders/{order_id}`, `WS /tickets/{id}/ws`. Update tests and docs.
- A2.2 Mock order response is exactly `{"order_id","destination","package","status","esim_status"}`, e.g.
  ORD-10293 -> Turkey / "10 GB" / "completed" / "installed". Keep a few more mock orders. No auth
  dependency, no `customer_email` (it leaks other customers' e-mails). Unknown id -> 404 in the error
  shape. Put the schema in its own module.
- A2.3 Delete `POST /tickets/agent`, `POST /tickets/{id}/messages/internal` and the schemas
  `TicketCreateByAgent`, `MessageCreateInternal`, `MessageUpdate` (also from `schemas/__init__.py`).
  `POST /tickets` serves both roles; `POST /tickets/{id}/messages` takes `message_type` in the body and
  the service decides who may use it.
- A2.4 Error handling (§20). Replace every bare `raise ValueError` (in `ticket_service.py` and
  `message_service.py`) with domain exceptions in `app/core/exceptions.py`: `NotFoundError` 404,
  `ForbiddenError` 403, `ConflictError` 409 (code `INVALID_STATUS_TRANSITION`, details `{from,to}`).
  Delete every `try/except ValueError` in the routes (they guess the status code from message text).
  Register ONE set of handlers in `main.py`, all returning `{"error": {"code","message","details"}}`:
  those exceptions; `RequestValidationError` (422); sqlalchemy `OperationalError` -> 503
  `DATABASE_UNAVAILABLE` with a generic message (log the real error server-side, never SQL or driver
  text); a catch-all 500 with a generic message. Define an `ErrorResponse` schema and declare it in the
  routes' `responses=` so OpenAPI documents 403/404/409/422. Required codes: customer PATCH 403;
  customer posting INTERNAL_NOTE 403; invalid agent id 404; OPEN->CLOSED 409; a customer asking for
  someone else's ticket 404 (do not reveal existence); an agent e-mail used as `customer_email` (§9) 409.
- A2.5 Validation: `priority` is required on create (no default, missing -> 422); strip whitespace on
  subject, description and message body; normalise `customer_email` (strip + lower case) before
  find-or-create.
- A2.6 Startup: the `main.py` lifespan calls `check_database_connection()` from `app.core.db_check` and
  lets `DatabaseConnectionError` propagate (the app refuses to start with the readable message). It must
  not run in tests (conftest uses `TestClient` without `with`; keep it). `/health` runs `select 1`:
  200 `{"status":"ok","database":"up"}` or 503 `{"status":"degraded","database":"down"}`. CORS:
  `allow_origins` from a setting (default `http://localhost:5173` and `http://127.0.0.1:5173`),
  `allow_credentials=False`.
- A2.7 Needed by the frontend: `GET /users?role=AGENT|CUSTOMER` (agents only; `{id,name,email,role}`) for
  the assignee dropdown, and, until B1 replaces it, `GET /demo/users` (no auth; same fields; enabled only
  while setting `DEMO_MODE` is true, default true) so the UI can offer a "who am I" picker. Document both
  as demo mechanisms (authentication is out of scope in the docx).

## A3 - Correctness and quality

- A3.1 N+1 (§33). `list_tickets` and `get_ticket_detail` call `get_user_by_id` in loops, and the same
  `TicketResponse(...)` block is pasted in several places. Eager-load `customer`, `assigned_agent`,
  `messages -> sender` and `events -> actor` (`selectinload`) in the repository and write ONE mapper per
  response type, used by list, detail, POST and PATCH. Keep A1.2 and A1.3.
- A3.2 Realtime (docx core requirement: replies appear live in BOTH directions without refresh). After
  the explicit commit from A0.1, schedule `manager.broadcast_to_ticket` with `BackgroundTasks`:
  `{"event":"message.created","ticket_id":..,"message":{id,ticket_id,sender_id,sender_name,message_type,
  body,created_at}}`, REPLY only. NEVER broadcast INTERNAL_NOTE (the manager stores no roles).
  `websocket/manager.py`: `json.dumps(message)` raises `TypeError` on datetime and sits outside the
  try/except; build the payload with `model_dump(mode="json")` and use `default=str`. Prove it with two
  `TestClient` websocket connections (customer and agent on one ticket): an agent reply reaches the
  customer, a customer reply reaches the agent, an internal note reaches nobody.
- A3.3 Ordering and timestamps. Events written in one PATCH share one `created_at` (PostgreSQL `now()` is
  the transaction start), so order events and messages by `(created_at, id)`. Set `ticket.updated_at`
  only when something actually changed, and also when a message is added, so lists sorted by
  `updated_at` show the latest activity.
- A3.4 New Alembic revision (leave `1fca2e4cff33` untouched; models must match it so `alembic check`
  reports no diff): CHECK constraints on `users.role`, `tickets.status/priority/category`,
  `ticket_messages.message_type`, `ticket_events.event_type`; unique index on `lower(users.email)`;
  `ticket_events.metadata` as JSONB; index on `tickets.category`. Must upgrade on a fresh database and
  downgrade cleanly.
- A3.5 Tests on real PostgreSQL. The suite currently runs on in-memory SQLite, which forces test-only
  branches into production code (`BigIntegerPK` sqlite variant in `database.py`, the count-based ticket
  number fallback in `TicketRepository.get_next_ticket_number`) and never executes the real `nextval`
  path (§8). Move to database `badi_support_test` (create only that one): build the schema with
  `alembic upgrade head` once per session, truncate between tests, and make conftest refuse to run
  unless the database name ends in `_test`. Then delete the SQLite variant and the dialect branch.
  Required tests: ticket creation gives a BD- number and status OPEN and the row survives in a new
  session (docx example test 1); a status change writes an audit row old OPEN / new IN_PROGRESS (docx
  example test 2); 20 parallel creates give 20 distinct numbers; FK violation rejected; OPEN->CLOSED is
  409 with the error shape; a customer never sees notes or events; a customer cannot create for another
  e-mail (403) nor read another customer's ticket (404); missing/unknown user 401; `OperationalError`
  -> 503; the A3.2 websocket test.
- A3.6 Minor: unassign uses the magic value 0 and unassigning an unassigned ticket writes a
  `None -> None` ASSIGNED event. Use `model_fields_set` to tell "not sent" from null and skip the audit
  row when old == new.

## A4 - Submission material (no frontend)

- A4.1 `backend/seed.py`, run as `python seed.py` from `backend/` on `badi_support`. Refuses to run if
  users already exist unless `--reset` (which truncates only the 4 data tables of the configured
  database and restarts `ticket_number_seq`). 3 agents (Anas, Rahim and one more) and 5 customers;
  8-10 tickets covering all 6 statuses, 4 priorities and 7 categories (plan §35 table BD-1001..BD-1008);
  messages including internal notes; audit events consistent with each ticket's history; explicit
  realistic `created_at` values. Ticket 1 mirrors the docx: BD-1001, customer@example.com, ORD-10293,
  CONNECTIVITY, "eSIM installed but no internet", HIGH, currently IN_PROGRESS and assigned to Anas;
  conversation 10:30 customer "My eSIM is installed but internet is not working." / 10:35 support "Are you
  currently in Turkey?" / 10:40 customer "Yes." / 10:44 internal note "Escalated to upstream provider for
  status verification."; audit: OPEN -> IN_PROGRESS, assigned to Anas, priority MEDIUM -> HIGH. Ticket
  numbers come from `ticket_number_seq` so the next real ticket continues the series. Print a table of
  user ids, names and roles at the end.
- A4.2 `README.md` at the repo root: what it is; prerequisites; setup (venv, `pip install -r
  requirements.txt`, copy `.env.example` to `.env`, create the database, `alembic upgrade head`,
  `python seed.py`, `python run.py`); the demo identity (X-User-Id, `GET /demo/users`); endpoint table
  with filters (`status`, `priority`, `category`, `assigned_agent_id`, `search`, `page`, `page_size`);
  WebSocket URL and event shape; the error shape; how to run tests (`badi_support_test`); design
  decisions and assumptions/trade-offs (state-transition map, find-or-create customer policy, audit in
  the same transaction, internal notes enforced in the backend, in-process WebSocket manager with Redis
  pub/sub as the scaling path, ticket-number sequence, 404 for other customers' tickets, demo identity
  instead of auth: plan Appendix A); "What I would improve with more time" (plan §47); known limitations.
  Leave a clearly marked "Frontend" TODO section; do not describe a frontend that does not exist.
- A4.3 `docs/ai-transcripts/README.md`: list the AI tools used (Cline, Kilo Code, Claude Code), say the
  session exports are added there, and state that nothing in that folder is edited or summarised. Do NOT
  invent or paste transcript content.
- A4.4 Git. Verify `.gitignore` covers `.env`, `.venv/`, `__pycache__/`, `.pytest_cache/`,
  `node_modules/`. Run `git init`. Only when pytest is green, make honest commits with conventional
  messages (§42), e.g. `chore: project setup and alembic`, `feat: models and initial migration`,
  `feat: schemas, repositories and services`, `feat: API routes and websocket`, `test: ...`,
  `docs: README and plan`. Never backdate or fabricate history; the first commit is a baseline and the
  README says so. No remote, no push. `git status` must show no secrets before each commit.
- A4.5 OPTIONAL, last, only when everything above is green: `docker-compose.yml` with PostgreSQL and the
  backend.

VERIFY (Part A, paste real output): pytest on `badi_support_test` all green, with counts; `alembic
upgrade head` and `alembic check` on a fresh database; `python run.py` starts with the good database and,
with `DATABASE_URL` pointing at a missing database, prints the readable message and does not start;
smoke against the running app with the seeded ids: no header 401; customer creating for another e-mail
403; customer GET detail has no events and no notes; agent PATCH OPEN->CLOSED 409 with the error shape;
`GET /mock/orders/ORD-10293` returns exactly the docx JSON; the list filters work; a ticket created by
POST is still there after restarting the server.

---

# Part B - JWT authentication and frontend

Precondition for all of Part B: Part A finished and green.

## B1 - JWT authentication (optional bonus; replaces the X-User-Id demo identity)

Auth is an optional bonus in the docx (role-based access), so keep it small.

- B1.1 Add PyJWT and bcrypt (or `pwdlib[argon2]`) to `requirements.txt`. Do not use passlib (unmaintained).
- B1.2 Config (`core/config.py`, `.env`, `.env.example`): `JWT_SECRET` (required, at least 32 characters;
  `.env.example` holds a placeholder; the app refuses to start with a readable message, same style as
  `db_check`, if it is missing, shorter than 32 or still the placeholder), `JWT_ALGORITHM=HS256`,
  `ACCESS_TOKEN_EXPIRE_MINUTES=60`. Put a real random secret in the local `.env`
  (`python -c "import secrets; print(secrets.token_urlsafe(48))"`). Never log or return it.
- B1.3 New Alembic revision: `users.password_hash` String(255), NULLABLE. Users created implicitly by an
  agent's ticket (find-or-create) have NULL and cannot log in; document this known limitation (real
  systems invite the customer by e-mail). `password_hash` never appears in a response schema or a log.
- B1.4 `app/core/security.py`: `hash_password`, `verify_password`, `create_access_token(user)` with claims
  `sub` (user id as string), `iat`, `exp` and `role` (informational only), `decode_access_token`
  distinguishing expired from invalid. Authorization NEVER trusts the role claim: load the user from the
  database on every request, so a role change or a removed user takes effect at once.
- B1.5 Endpoints (root paths): `POST /auth/login {email,password}` ->
  `{access_token, token_type:"bearer", user:{id,name,email,role}}`; `GET /auth/me` -> current user. Every
  login failure is 401 `INVALID_CREDENTIALS` with the same generic message (unknown e-mail, wrong
  password, NULL hash); for an unknown e-mail still run a dummy hash verification so response time does
  not reveal which e-mails exist. Optional: `POST /auth/register` for customers (role forced to CUSTOMER,
  password at least 8 characters, 409 if the e-mail exists).
- B1.6 `deps.py`: replace X-User-Id with `Authorization: Bearer <token>` (`HTTPBearer(auto_error=False)`
  so errors keep our shape). Missing -> 401 `NOT_AUTHENTICATED`; bad signature or format -> 401
  `INVALID_TOKEN`; expired -> 401 `TOKEN_EXPIRED`; each with a `WWW-Authenticate: Bearer` header and the
  standard error body. Remove the X-User-Id header, `GET /demo/users` and the `DEMO_MODE` setting
  entirely. Keep `GET /users?role=` (agents only).
- B1.7 WebSocket: browsers cannot set headers, and tokens in URLs end up in access logs, so authenticate
  with a first message. After accept, the client must send `{"type":"auth","token":"<jwt>"}` within 5
  seconds; validate the token, load the user, check ticket access, and only then register the connection
  with the manager; otherwise close with 1008. Remove the `?user_id=` parameter.
- B1.8 Seed: every seeded user gets a password hash; one documented demo-only password for all seeded
  accounts; print the e-mail/role table at the end of `seed.py`.
- B1.9 Tests on the real PostgreSQL test DB: login ok / wrong password / unknown e-mail (identical
  response); no token, malformed, tampered and expired token (build one with a negative expiry) give the
  right 401 codes; a token for a user that no longer exists -> 401; a customer token cannot do agent
  actions (403) nor read another customer's ticket (404); websocket: no auth message -> closed, customer
  token on someone else's ticket -> closed, valid token receives `message.created`. Move all existing
  tests from X-User-Id to tokens through ONE fixture.
- B1.10 README: auth section (flow, env vars, demo accounts, token lifetime, no refresh tokens, secret
  handling, limitations) and remove the X-User-Id/demo text. Record in the trade-offs that plan §6/§39
  (no passwords, demo identity) was superseded by this optional bonus.

VERIFY: pytest green; `alembic upgrade head` and `alembic check` clean on a fresh database; curl login,
then `GET /auth/me` and `GET /tickets` with the token; a tampered token -> 401 `INVALID_TOKEN`; the app
refuses to start without `JWT_SECRET`. Paste real output.

## B2 - Frontend: initialize the project (no real screens yet)

Create `frontend/` at the repo root (React + TypeScript + Vite).

- B2.1 `npm create vite@latest frontend -- --template react-ts`. Keep dependencies minimal: `react`,
  `react-dom`, `react-router-dom`. No UI framework, no state library; one `src/styles.css` with CSS
  variables (readable, responsive down to about 900px). TypeScript strict; `npm run build` and
  `npm run lint` must pass.
- B2.2 Structure per plan §21: `src/api`, `components`, `pages`, `hooks`, `types`, `utils`, `App.tsx`,
  `main.tsx`. Routes: `/login`, `/tickets`, `/tickets/new`, `/tickets/:id` (placeholders).
- B2.3 `src/types` match `backend/app/schemas` exactly: `TicketStatus`, `TicketPriority`,
  `TicketCategory`, `MessageType` as string-literal unions; `User`, `Ticket`, `TicketDetail` (messages,
  events), `TicketListResponse`, `ErrorResponse`; plus constant arrays of statuses, priorities and
  categories for dropdowns. Generate from `http://127.0.0.1:8000/openapi.json` with `openapi-typescript`
  if it works cleanly, otherwise hand-write; the types must not drift from the backend.
- B2.4 `src/api/http.ts` is the only place that calls `fetch`: base URL from `VITE_API_BASE_URL` (default
  `http://127.0.0.1:8000`, documented in `frontend/.env.example`); JSON in/out; attaches
  `Authorization: Bearer <token>` when a token exists; converts the backend error body
  `{"error":{code,message,details}}` into `ApiError(code, message, status)`; a network failure becomes
  `ApiError("NETWORK_ERROR", "Cannot reach the server. Check that the API is running.")`; on 401 calls a
  registered `onUnauthorized` callback (wired in B3). Thin typed modules `api/tickets.ts`, `users.ts`,
  `orders.ts`, `auth.ts` with no UI code.
- B2.5 `src/utils`: `formatDateTime`, `relativeTime` (absolute time in a `title` attribute), `classNames`.
- B2.6 The placeholder home page calls `GET /health` and shows OK or an error state, proving CORS and the
  base URL from `http://localhost:5173`.
- B2.7 `frontend/README.md` (install, run, build, env); add `frontend/node_modules` and `frontend/dist`
  to `.gitignore`.

VERIFY: `npm run build` and `npm run lint` output; `npm run dev` with the health call working in the
browser (describe what you saw).

## B3 - Frontend: login and role-aware routing

- B3.1 `AuthContext` + `useAuth` holding `{token, user}`: `login(email, password)` -> `POST /auth/login`;
  `logout()`; on load restore the session from `sessionStorage` (chosen over `localStorage` so the token
  dies with the tab; note in the README that httpOnly cookies would be better in production) and
  validate it with `GET /auth/me`. Register the `http.ts` `onUnauthorized` callback to log out and go to
  `/login` with "Your session expired."
- B3.2 Login page: labelled e-mail and password, client validation (e-mail format, non-empty), button
  disabled with "Signing in..." while loading, API error shown visibly (`INVALID_CREDENTIALS` as one
  generic message), Enter submits, focus moves to the first invalid field. A collapsible "Demo accounts"
  box lists the seeded e-mails and the demo password from the README, shown only when
  `VITE_SHOW_DEMO_ACCOUNTS=true` (default true in `.env.example`).
- B3.3 `RequireAuth` wrapper: no session -> `/login`, and return to the target page after login. Layout
  with a top bar: app name, user name + role badge, Logout. After login both roles land on `/tickets`
  (the list differs by role in B4).
- B3.4 Role helper `isAgent(user)` in one place. The UI hides agent-only controls, but the backend is the
  authority: every 403/404 from the API shows a clear message, never a silent failure.

VERIFY: build/lint; log in as a seeded agent and as a seeded customer; a wrong password shows the
generic error; removing the token in devtools and reloading goes to `/login`; an invalid or expired
token on any API call logs you out. Describe the results.

## B4 - Frontend: ticket list with filters

- B4.1 One `TicketListPage` for both roles. Customer: own tickets (the backend already scopes them),
  status filter, "Create Ticket" button. Agent: filters status, priority, category, assigned agent
  (agents from `GET /users?role=AGENT`, plus "Any") and a search box (debounced 300 ms, backend `search`
  param). Columns per plan §22/§24: number, subject, (agent: customer), category, priority, status,
  (agent: assignee), updated (relative time with the absolute time in `title`).
- B4.2 Filters live in the URL query string (`?status=OPEN&priority=HIGH&page=2`) so state survives
  refresh and back/forward; changing a filter resets the page to 1; pagination from `total_pages`; a
  "Clear filters" button.
- B4.3 A shared hook (`useTickets`/`useAsync`) returning loading, error, data; stale responses from
  earlier filter values are ignored so results never arrive out of order.
- B4.4 States per plan §28-30: Loading "Loading tickets..."; Empty "No tickets found." when there are
  none at all vs "No tickets match your filters." with a clear-filters action; Error "Unable to load
  tickets." with a Try again button. An error must never look like an empty list.
- B4.5 `StatusBadge` and `PriorityBadge` components with colour AND a text label (§31); rows are
  keyboard-focusable links; the table has a caption and `th scope`.

VERIFY: build/lint; describe filter combinations, URL sync, the three states (stop the API for the error
state, filter to nothing for the empty state), agent vs customer columns.

## B5 - Frontend: ticket detail, conversation thread, reply composer

- B5.1 `TicketDetailPage` (`/tickets/:id`) loads `GET /tickets/{id}`. Header: number, subject, status and
  priority badges, category, customer e-mail (agent view), created/updated times. 404 -> "Ticket not
  found." with a back link (the backend also answers 404 for another customer's ticket on purpose);
  other errors -> error state with retry.
- B5.2 Order summary card when `order_id` exists: `GET /mock/orders/{order_id}` shows destination,
  package, status, esim_status read-only. Its own small loading/error ("Order details unavailable") that
  never blocks the rest of the page.
- B5.3 Conversation thread, oldest first: sender name, timestamp, body with whitespace preserved and
  rendered as TEXT, never as HTML. Customer messages and agent replies look different; INTERNAL_NOTE
  (only agents ever receive them) is visually distinct and labelled "Internal note (agents only)". Empty
  state "No messages yet." Auto-scroll to the newest message.
- B5.4 Composer: textarea + Send. Agents get a segmented control "Reply | Internal note" that sets
  `message_type` and changes the button label/colour so the mode is obvious; customers have no toggle and
  always send REPLY. Non-empty after trim; Send disabled and labelled "Sending..." during the request (no
  double submit); on failure keep the typed text and show "Unable to send message. Please try again.";
  on success append the message returned by POST (dedupe by id, because B7 also receives it over the
  WebSocket) and clear the box.
- B5.5 Agents only: a collapsible "History" timeline from `events` (actor, text such as "Status changed:
  OPEN -> IN_PROGRESS", "Assigned to: Anas", "Priority changed: MEDIUM -> HIGH", time). Customers never
  see this section.

VERIFY: build/lint; describe: a customer sees no internal notes, no toggle, no history; an agent sees
all; a failed send keeps the text; the 404 page; a failing order card does not break the page.

## B6 - Frontend: agent controls and ticket creation

- B6.1 Agent controls on the detail page (not rendered for customers). Status dropdown listing the current
  status plus its allowed next states, taken from ONE constant that mirrors the backend map
  (OPEN->IN_PROGRESS; IN_PROGRESS->WAITING_FOR_CUSTOMER|WAITING_FOR_PROVIDER|RESOLVED;
  WAITING_*->IN_PROGRESS; RESOLVED->CLOSED|IN_PROGRESS; CLOSED->none). Priority dropdown. Assignee
  dropdown (agents from `GET /users?role=AGENT`) with an "Assign to me" shortcut. Each change sends
  `PATCH /tickets/{id}` with only the changed field, disables that control and shows "Updating...", then
  refreshes header and history from the server response; on error (409 invalid transition, 404 agent,
  403) show the backend message next to the control and reset the dropdown to the real value. The list
  is a convenience, the backend rule is final: never hide a server error. Test a 409 by changing the
  status in a second tab and then using the stale first tab.
- B6.2 `CreateTicketPage` (`/tickets/new`) with the docx fields: customer e-mail, optional order ID,
  category, subject, description, priority; required markers, real labels, inline validation (e-mail
  format, non-empty, subject max length equal to the backend's), submit disabled with "Creating..." while
  pending. Customer: e-mail prefilled from the session and read-only (the backend rejects other e-mails
  anyway). Agent: e-mail editable ("create on behalf of a customer"). On success show "Ticket created:
  BD-xxxx" and navigate to the ticket; on 403/409/422 show the backend message and keep the form values.
- B6.3 A small Toast/notice component for success and error messages (`aria-live="polite"`).

VERIFY: build/lint; describe the full agent triage flow (assign to me, priority change, IN_PROGRESS ->
RESOLVED -> CLOSED), the 409 case, that a customer sees no controls, and ticket creation as a customer
and as an agent.

## B7 - Frontend: real-time conversation (docx core requirement)

- B7.1 `useTicketSocket(ticketId, onMessage)`: open `ws(s)://<API host>/tickets/{id}/ws` (derived from
  `VITE_API_BASE_URL`); on open immediately send `{"type":"auth","token":<jwt>}`; handle
  `{"event":"message.created","ticket_id","message":{...}}`: ignore other tickets and unknown events,
  dedupe by message id (the sender also gets the HTTP response), append in order. Clean up on unmount and
  when `ticketId` changes.
- B7.2 Reconnect with exponential backoff (1s, 2s, 4s ... max 15s, reset on success); after a reconnect
  refetch the ticket so nothing sent meanwhile is missed. If the server closes with 1008 (auth/access),
  do not retry: log out on an expired token, otherwise show "You no longer have access."
- B7.3 A small connection indicator on the detail page: "Live" / "Reconnecting..." / "Offline", with text
  and not colour only.
- B7.4 Defence in depth: the backend never broadcasts INTERNAL_NOTE, and a customer session must also
  never render an incoming event whose type is INTERNAL_NOTE.

VERIFY: describe a two-browser test (agent in one window, customer in a private window on the same
ticket): an agent reply appears in the customer window without refresh; a customer reply appears in the
agent window; an internal note appears only in the agent's own window; stopping and restarting the API
reconnects. Also `npm run build` and lint output.

## B8 - Frontend QA, tests, submission notes

- B8.1 Walk every screen with the plan §55 matrix (Loading, Empty, Success, Error, Retry, Disabled,
  Validation) and fix the gaps. Accessibility per §31: labels, visible focus, keyboard-only use of
  forms/tables/dropdowns, badges with text, no colour-only meaning, sensible page titles.
- B8.2 About six focused tests (Vitest + React Testing Library): the composer hides the internal-note
  toggle for customers; internal-note mode sends `message_type` INTERNAL_NOTE; the status dropdown offers
  only allowed next states; the list shows the error state and Try again refetches; empty vs
  filtered-empty messages; `ApiError` mapping of the backend error shape. `npm test` passes.
- B8.3 Run the 26 scenarios of plan §56 by hand against the seeded data and record each pass/fail with
  notes in `docs/QA.md`. Be honest about failures.
- B8.4 README: replace the Frontend TODO with setup, running backend + frontend together, env vars, demo
  accounts, folder structure, the data flow (pages -> hooks -> api -> backend), the front-end trade-offs
  (sessionStorage token, no state library, URL-synced filters, in-process WebSocket) and what you would
  improve.
- B8.5 Git: commit the frontend in logical commits (`chore: init frontend`, `feat: auth`, `feat: ticket
  list`, `feat: ticket detail and composer`, `feat: agent controls and create ticket`, `feat: realtime`,
  `test/docs`) only when build, lint and tests pass; no push.

VERIFY: paste the build/lint/test output and the `docs/QA.md` table.
