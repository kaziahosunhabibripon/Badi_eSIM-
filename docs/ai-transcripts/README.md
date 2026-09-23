# AI-assisted development process

## Tools used and their roles

### Kilo Code — primary implementation

Used for the bulk of hands-on coding under direct instruction: project scaffolding,
backend structure (models, repositories, services, routes), initial frontend setup,
and applying specific corrections when a review turned up a problem.

### Cline — testing and review

Used to inspect the project separately from the tool that wrote it: running the app,
looking for bugs, incorrect behavior, and gaps against the requirements, and reporting
findings back for a human decision on whether and how to act on them.

### Claude Code — research, review, and direct implementation

Claude's role was broader than research alone and changed over the course of the
project. It included:

- Reviewing backend and frontend code against the assignment PDF requirement-by-requirement
- Investigating and root-causing bugs found during review or live testing
- Writing fix instructions for Kilo Code to execute, then re-reviewing the result
- Directly authoring/rewriting substantial parts of the codebase itself, including:
  the frontend application shell, ticket detail/list/create-ticket screens, shared UI
  components, the real-PostgreSQL test fixtures, seed data, the Docker setup
  (`Dockerfile`s + `docker-compose.yml`, built and run locally to verify it actually
  works end to end), and this documentation
- Managing git history and the GitHub push for submission

In other words: Claude was not only a research/reasoning assistant on this project —
a significant share of the final code was written directly by Claude under human
direction, review and correction, the same as Kilo Code's role. The actual
`claude-code-session.md` transcript is the accurate record of which parts.



## Development flow

Requirements → research/investigation → architecture decisions → implementation
(Kilo Code and/or Claude Code, depending on the task) → my review → live testing →
Cline review pass → gaps found → root-cause investigation → corrective instruction →
re-implementation → retest → final review → submission.

This iterative loop — not a single prompt producing the whole project — is what the
transcripts below are evidence of.

## What belongs in this folder

The real session exports from each tool, as their own files:

```
docs/ai-transcripts/
├── README.md                 
├── claude-code-session.md
├── kilo-code-session.md
└── cline-session.md
```

Section	Result
1. Ticket creation	Customer o agent dutoi create korte pare, customer_email/order_id(optional)/category/subject/description/priority shob capture hoy, BD-#### number generate hoy, notun ticket shobshomoy OPEN
2. Workflow	Thik 6-ta status, thik 4-ta priority, 7-tai category ache — exact match PDF-er sathe
3. Conversation + internal notes	Customer/agent reply korte pare; agent internal note add korte pare, customer korte parena (403); message-e sender/type/timestamp ache; real WebSocket diye verify korlam — customer live agent-er reply dekhe, agent live customer-er reply dekhe, internal note kokhonoi customer-er socket-e pouchay na
4. Agent actions	View+filter (status/priority/category/assigned-agent shob filter kaj kore, search bonus-o ache), full conversation dekha, status/priority change, assign o reassign — shob verify kora
5. Audit history	Status change ar assignment change record hoy (minimum requirement), priority change-o hoy (bonus)
Technical requirements
FastAPI + PostgreSQL + SQLAlchemy + Alembic — fresh DB-e alembic upgrade head kaj kore, alembic check-e kono drift nai.
Minimum API surface exact match: POST /tickets, GET /tickets, GET /tickets/{id}, PATCH /tickets/{id}, POST /tickets/{id}/messages — kono prefix chhara, PDF-e jemon deya ache thik temon.
GET /mock/orders/ORD-10293 PDF-er JSON-er sathe byte-for-byte mile.
Data model: users, tickets, ticket_messages, ticket_events — sensible separation.
Validation/error handling: invalid input 422, invalid workflow transition reject hoy (409), structured error shape.
Testing + Submission checklist
PDF-e minimum 2-ta test chায়, ache 50-ta, real PostgreSQL-e (SQLite na).
README, seed.py, git repo — shob ache, verify kora.
docs/ai-transcripts/ — shudhu README (folder ready), asol Cline/Kilo/Claude-er session export ekhono tomar nijer add korte hobe — eta submission-er required item ar ami banate pari na.
Ja backend-er ongsho na, kintu grading-e ache
Frontend (20% weight) ekhono banano hoyni. Tumi age bolechile shuru korte, tarpor PDF check korte bolle. Backend-er dik theke — full fulfilled, kono gap nai. Frontend shuru korbo ekhon?
frontend pdf dekhe korba tar gae ami 
Read AGENTS.md fully first (rules, target architecture, protocol) - it applies here too. Then read
docs/agent-tasks.md sections B2 through B8 (the full spec for each is there; this message only adds
what changed since it was written and the run-order override below).

CONTEXT: The backend (Part A) is done and verified: 50 pytest tests green on real PostgreSQL, every
core requirement in the assignment PDF checked end-to-end (46/46 automated checks), git history in
place. B1 (JWT) was explicitly decided against - the assignment lists auth as an optional bonus, not a
requirement - so the frontend uses the backend's existing demo identity instead: header
X-User-Id: <id>, and GET /users/demo (no auth) to list the seeded users for a "choose who you are"
picker. There is no login form, no password, no token anywhere in this frontend.

RUN ORDER OVERRIDE: unlike AGENTS.md's normal one-step-then-stop protocol, do B2 through B8
continuously in this session, running each step's own VERIFY before moving to the next. Only stop
early if something is genuinely blocking (for example a VERIFY that will not pass no matter what you
try) - explain exactly what and why. Otherwise keep going through B8 and give ONE final report at the
end covering everything.

Ground truth for exact shapes - do not guess, read these files first:
- backend/app/schemas/*.py - every field name and type the frontend's types must match exactly.
- backend/app/models/ticket.py - TicketStatus/TicketPriority/TicketCategory enum values, and
  TicketService.VALID_TRANSITIONS in backend/app/services/ticket_service.py for the status map B6.1
  needs to mirror.
- backend/app/api/routes/*.py - the real, current routes (no /api/v1 prefix): POST /tickets,
  GET /tickets, GET /tickets/{id}, PATCH /tickets/{id}, POST /tickets/{id}/messages,
  WS /tickets/{id}/ws?user_id=<id>, GET /mock/orders/{order_id}, GET /users?role=, GET /users/demo,
  GET /health. Every response body is wrapped as {"error": {"code","message","details"}} on failure.
- README.md (repo root) - already documents all of the above; read it before B2.3/B8.4 so the frontend
  section you add there is consistent with it rather than duplicating or contradicting it.

Do not start the backend server yourself and do not change anything under backend/, alembic/, or the
root .env/.env.example - Part A is finished and reviewed; if you find something there that looks wrong,
say so in your report instead of touching it. CORS already allows http://localhost:5173 and
http://127.0.0.1:5173 (backend/app/core/config.py) so the default Vite dev port needs no backend change.

Proceed:
B2  - initialize frontend/ (Vite + React + TS), types matching the schemas, the X-User-Id-aware
      http.ts client, utils, a health-check home page.
B3  - IdentityContext, /choose-identity page backed by GET /users/demo, RequireIdentity, layout with a
      "Switch identity" control. Label it plainly as a demo mechanism, not a real sign-in.
B4  - ticket list, role-aware filters and columns, loading/empty/error states.
B5  - ticket detail, order summary card, conversation thread, reply/internal-note composer,
      agent-only audit history.
B6  - agent status/priority/assignee controls, create-ticket page, toast notices.
B7  - realtime: WebSocket at /tickets/{id}/ws?user_id=<id> (not a header, not a first auth message -
      that is a query parameter the backend expects), reconnect with backoff, a live/reconnecting/
      offline indicator, and never rendering an INTERNAL_NOTE even defensively.
B8  - full QA pass against plan.md section 55's matrix, ~6 Vitest/RTL tests, docs/QA.md with the 26
      scenarios from plan.md section 56 run by hand and recorded honestly, README.md's Frontend
      section replaced with real instructions, and git commits (chore/feat/test/docs) once build+lint+
      test all pass. No git push.

FINAL REPORT: a table of B2-B8 with DONE / NOT DONE and why for each, every file created or changed,
and the exact npm run build / npm run lint / npm test output pasted in full.


frontend/src/App.tsx — navy sidebar, header, mobile drawer, routing
frontend/src/pages/ — ChooseIdentity, TicketListPage, TicketDetailPage rewrite; CustomersPage notun
frontend/src/components/ — CreateTicketModal (page-er bodole modal), ui/Button.tsx, ui/Select.tsx, ui/Modal.tsx
frontend/src/hooks/useIdentity.ts — Context-e convert (header sync fix)
frontend/src/api/http.ts — session-reload bug fix
backend/Dockerfile, frontend/Dockerfile, docker-compose.yml — notun, build+run kore verify kora
README.md — Quick start, architecture/sequence diagram (mermaid), Docker section
docs/ai-transcripts/README.md — process doc
.env.example, code-er comments — strip kora