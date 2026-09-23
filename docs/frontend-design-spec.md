# Badi eSIM Support — UI/UX Design Specification

**Audience:** written for an AI UI-generation tool (Pen.dev or similar) to build a React +
TypeScript + Tailwind frontend from, and for you to review before handing it off.

**Grounded in the real backend contract.** Every field name, enum value, and example below
is taken directly from the actual FastAPI backend (`backend/app/schemas`, `backend/app/models`)
and the assignment brief, not invented — a UI built to this spec should need no guessing to
wire up.

> ⚠️ **One implementation fact, stated once:** the backend does **not** have a working
> `/auth/login` endpoint yet — it currently identifies the caller with an `X-User-Id` header
> (a demo stand-in for login, since the assignment lists auth as an optional bonus, not a
> requirement). Section 9 (Login) and Section 26 (the Pen.dev prompt) describe the login
> screen as a normal email/password flow because that is the intended target, but whoever
> wires the frontend to the API needs a real login endpoint to exist first, or the screen
> will have nothing to call. This is the only backend fact in this document; everything else
> below is UI/UX.

---

## 1. Product overview

**Product:** Badi eSIM Support — a support ticketing module for Badi eSIM (an eSIM product by
Digital Cloud Communications). Customers open and follow support cases; support agents triage,
reply, assign, resolve, and keep an audit trail.

**Roles:** `AGENT`, `CUSTOMER` — two experiences of the same application, not two products.

**Core workflow:**

- **Customer:** sign in → *My Tickets* → create a ticket → open a ticket → read the
  conversation → reply → see agent replies arrive live.
- **Agent:** sign in → *Support Inbox* → search/filter → open a ticket → review the full
  conversation and history → reply or add an internal note → change status/priority →
  assign/reassign → see customer replies arrive live.

**Scope discipline:** this is a ticketing tool, not an analytics product. No dashboards, no
charts, no KPIs, no fabricated metrics anywhere. Every number shown on screen must come from
a real ticket, message, or event — nothing is invented for visual effect.

---

## 2. Design principles

1. **Calm, not loud.** The interface's job is to make triage fast and conversations legible.
   Color communicates state; it does not decorate.
2. **One product, two roles.** The agent and customer experiences share the same shell,
   components, and visual language — the agent view simply reveals more controls. Nothing
   about the *customer* view should look like a stripped-down, lesser version of the app.
3. **Density with air.** Support agents scan many tickets quickly; give them a dense table
   with excellent alignment, not a sparse consumer-app layout — but never let density become
   clutter. Whitespace is a deliberate choice, not leftover space.
4. **The conversation is the product.** On the ticket detail screen, everything else (status,
   priority, assignee, order info, audit trail) is supporting context around the conversation,
   never competing with it for attention.
5. **Every state is designed.** Loading, empty, and error are not afterthoughts bolted on
   after the "happy path" — they are designed with the same care as the populated screen.
6. **Boring in the right way.** No component the interviewer hasn't seen work correctly.
   Subtle motion, not spectacle.

---

## 3. Brand direction

An original Badi eSIM visual language — not a copy of Linear, Stripe, Intercom, or Zendesk,
but built to the same bar of restraint and craft those products share. Deep indigo as the one
brand color, everything else neutral slate, semantic color reserved strictly for ticket state.

**Voice in the UI:** direct, plain, never cute. "No tickets match your filters," not
"Hmm, we couldn't find anything!" No exclamation marks in system copy.

**Wordmark:** "Badi eSIM" in the sidebar, set in the UI typeface at weight 700, no logomark
required — a small monogram square (rounded, brand-indigo background, white "B") may sit to
its left if a mark is wanted.

---

## 4. Color system

Two color families: **Slate** (structure, text, borders) and **Indigo** (the one brand
accent, used for the primary action and the `IN_PROGRESS` state). Everything else is semantic.

### Neutral scale (Slate)

| Token | Hex | Use |
|---|---|---|
| `slate-25` | `#FAFBFC` | App background |
| `slate-50` | `#F8FAFC` | Subtle surface (table header, hover) |
| `slate-100` | `#F1F5F9` | Card/panel background, badge backgrounds |
| `slate-200` | `#E2E8F0` | Borders, dividers |
| `slate-300` | `#CBD5E1` | Stronger borders, disabled control borders |
| `slate-400` | `#94A3B8` | Placeholder text, disabled text, `CLOSED` state |
| `slate-500` | `#64748B` | Secondary/muted text, timestamps |
| `slate-600` | `#475569` | Body text on light surfaces |
| `slate-700` | `#334155` | Headings, primary text on light |
| `slate-900` | `#0F172A` | Page background in the (optional) dark sidebar, highest-contrast text |
| `white` | `#FFFFFF` | Cards, inputs, modal surfaces |

### Brand (Indigo)

| Token | Hex | Use |
|---|---|---|
| `indigo-50` | `#EEF2FF` | Selected/active nav item background, focus ring background |
| `indigo-100` | `#E0E7FF` | `IN_PROGRESS` badge background |
| `indigo-500` | `#6366F1` | Links, secondary accents |
| `indigo-600` | `#4F46E5` | Primary buttons, primary focus ring, active nav indicator |
| `indigo-700` | `#4338CA` | Primary button hover/active |

### Semantic — ticket status

| Status | Badge bg | Badge text | Dot |
|---|---|---|---|
| `OPEN` | `slate-100` | `slate-700` | `slate-400` |
| `IN_PROGRESS` | `indigo-100` | `indigo-700` | `indigo-600` |
| `WAITING_FOR_CUSTOMER` | `#FEF3C7` (amber-100) | `#92400E` (amber-800) | `#D97706` (amber-600) |
| `WAITING_FOR_PROVIDER` | `#FFEDD5` (orange-100) | `#9A3412` (orange-800) | `#EA580C` (orange-600) |
| `RESOLVED` | `#DCFCE7` (green-100) | `#166534` (green-800) | `#16A34A` (green-600) |
| `CLOSED` | `slate-100` | `slate-500` | `slate-400` |

`OPEN` reads as neutral (nothing has happened yet); `IN_PROGRESS` is the one status that gets
the brand color, so an agent's eye is drawn to what's actively being worked.

### Semantic — priority

| Priority | Badge bg | Badge text |
|---|---|---|
| `LOW` | `slate-100` | `slate-600` |
| `MEDIUM` | `indigo-100` | `indigo-700` |
| `HIGH` | `#FFEDD5` (orange-100) | `#9A3412` (orange-800) |
| `URGENT` | `#FEE2E2` (red-100) | `#991B1B` (red-800), **weight 600** |

Priority badges are never the loudest thing on a row — `URGENT` is the only one that may add a
small filled dot instead of an outline, and even then, red is used nowhere else in the UI
except errors and destructive actions. **Text always accompanies color** — no badge, dot, or
indicator communicates meaning by hue alone (accessibility, and it's honest to how colorblind
agents actually triage).

### Functional

| Token | Hex | Use |
|---|---|---|
| `success` | `#16A34A` | Success toasts, confirmation |
| `danger` | `#DC2626` | Error toasts, destructive actions, invalid states |
| `warning` | `#D97706` | Non-blocking warnings ("order details unavailable") |
| `focus-ring` | `indigo-600` at 40% opacity, 3px | Every focusable element |

---

## 5. Typography

**Typeface:** Inter (variable), system-ui fallback stack. Numerals use tabular figures in the
ticket table (`font-variant-numeric: tabular-nums`) so columns of timestamps and IDs align.

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `display` | 24px / 32px | 700 | Page titles ("Support Tickets", "BD-1001") |
| `title` | 18px / 26px | 600 | Section titles, modal titles, ticket subject in header |
| `body-lg` | 15px / 24px | 400 | Message bubble text, form field values |
| `body` | 14px / 20px | 400 | Default UI text, table cells, buttons |
| `body-md` | 14px / 20px | 500 | Emphasized body text (sender names, nav labels) |
| `label` | 13px / 18px | 500 | Form labels, filter labels |
| `caption` | 12px / 16px | 500 | Timestamps, metadata, badge text (uppercase tracking +0.02em only for badges) |
| `mono` | 13px / 18px | 500, monospace | Ticket numbers (`BD-1001`), order IDs (`ORD-10293`) |

Line length for the conversation column is capped around 640–720px so long replies stay
readable, even on a wide desktop monitor.

---

## 6. Spacing, radius, elevation

**Spacing scale** (4px base): `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`. Component internal
padding uses the smaller steps (8–16); layout gaps between major regions use the larger steps
(24–48). Never an arbitrary odd value.

**Radius:** `sm` 6px (inputs, small buttons) · `md` 8px (cards, buttons, dropdowns) · `lg` 12px
(modals, the message composer panel) · `full` 999px (badges, avatars, pills).

**Shadow (all subtle — this product never uses a heavy drop shadow):**

- `shadow-xs`: `0 1px 2px rgba(15, 23, 42, 0.04)` — resting cards, table row hover.
- `shadow-sm`: `0 2px 8px rgba(15, 23, 42, 0.06)` — dropdown menus, the toast stack.
- `shadow-md`: `0 8px 24px rgba(15, 23, 42, 0.10)` — modals, the create-ticket dialog if a
  modal is used.

**Borders**, not shadows, do most of the separating work in this design (`slate-200`, 1px) —
shadow is reserved for things that visually float above the page (menus, modals, toasts).

---

## 7. Component system

Build these once, reuse everywhere — no screen invents its own button or badge style.

- **Button** — variants `primary` (indigo fill), `secondary` (white, slate border),
  `ghost` (no border, slate text, subtle hover fill), `danger` (red text/border, red fill on
  hover only for confirmed destructive actions). Sizes `sm` (32px), `md` (36px, default),
  `lg` (44px, used once: "Sign in"). Every button has a `loading` state (spinner replaces the
  label's leading position, label stays but changes to a verb-ing form — "Sending…",
  "Creating…", "Saving…" — button keeps its width so the layout doesn't jump) and a `disabled`
  state (40% opacity, no pointer).
- **Input / Textarea** — 36px height (inputs), white background, `slate-300` border, `sm`
  radius, focus ring per §4. Label above, `caption`-sized helper/error text below. Error state:
  border → `danger`, helper text → `danger`, a small inline icon before the error text.
- **Select** — same shell as Input, custom chevron icon, native `<select>` semantics
  preserved (keyboard and screen-reader friendly) rather than a fully custom listbox, unless
  the tool's component kit provides an accessible custom one.
- **Badge** — `full` radius, `caption` weight 500, 2px/8px padding, colors per §4. Status and
  priority badges always carry their text label, never an icon or color alone.
- **Avatar** — circular, `full` radius, initials (first letter of first + last name, e.g.
  "AK" for Anas Karim) on a deterministic slate/indigo background derived from the user's id
  (so the same person always gets the same color) — not a random photo placeholder.
- **Card / Panel** — white surface, `slate-200` 1px border, `md` radius, `shadow-xs`, 16–24px
  internal padding.
- **Modal** — used sparingly (this app prefers pages over modals — see §11); `lg` radius,
  `shadow-md`, backdrop `slate-900` at 40% opacity, focus-trapped, closes on `Esc` and
  backdrop click.
- **Toast** — bottom-right (not top-right — keeps the header/nav clear), `sm` radius,
  `shadow-sm`, auto-dismiss 4s with a pause-on-hover, manual close (×) always available,
  `success`/`danger` left border accent (3px) rather than a fully colored background (keeps
  toasts calm even when reporting an error).
- **Skeleton** — `slate-100` blocks with a slow (1.5s) shimmer, shaped to match the real
  content's geometry (a skeleton table row has the same column widths as a real row).
- **Empty state** — centered, a single small line-icon (not an illustration), one sentence of
  explanation, one optional action button.
- **Error state** — same layout as empty state, `danger`-tinted icon only (not the whole
  block), a "Try again" button that actually retries the failed request.
- **Tooltip** — dark (`slate-900`) surface, white text, `caption` size, 4px radius, used only
  for icon-only buttons and truncated text, never for content required to use the page.
- **Connection indicator** — a small dot + label, not a badge: filled `success` dot + "Live",
  filled `warning` dot (pulsing, subtle) + "Reconnecting…", outline `slate-400` dot +
  "Offline".
- **Message bubble** (see §13) and **Timeline item** (see §17) are their own compound
  components, detailed in their sections.

---

## 8. Application shell

**Desktop (≥1024px):** fixed left sidebar (240px, 72px when collapsed) + a content column
that fills the rest of the viewport, with its own top header bar (56px) and scrollable body.

```
┌──────────────┬──────────────────────────────────────────────────┐
│              │  Support Tickets              [search]  [avatar] │
│   Badi eSIM  ├──────────────────────────────────────────────────┤
│              │                                                  │
│   Tickets    │                                                  │
│   Customers* │                 main content                     │
│   Settings*  │                                                  │
│              │                                                  │
│              │                                                  │
│  ┌─────────┐ │                                                  │
│  │ avatar  │ │                                                  │
│  │ Anas K. │ │                                                  │
│  │ Agent   │ │                                                  │
│  │ Logout  │ │                                                  │
│  └─────────┘ │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

*Customers and Settings are optional nav items — include them only as disabled/future
placeholders if the tool wants a fuller-looking shell; do not build fake screens behind them.
For a customer-role user, the sidebar shows only **My Tickets** (and hides the concept of a
"support inbox" entirely — see §19).

**Sidebar:** wordmark top-left, a short nav list (icon + label, `body-md`), active item gets an
`indigo-50` background with a 2px `indigo-600` left indicator bar. Collapsible to an icon rail
(72px) via a small chevron control at the bottom of the nav list — collapsed state shows icons
only, with tooltips.

**Top header:** current page title (left), a global search field (center-left, ticket-scoped —
typing and pressing Enter goes to the inbox with that search applied), then the current user's
avatar + name + role badge (right), which opens a small menu with "Logout".

**Mobile (<768px):** sidebar becomes an off-canvas drawer (slides from the left, backdrop),
opened by a hamburger icon in the header, which now also carries the wordmark. Bottom sidebar
user block moves into the drawer's footer.

---

## 9. Login screen

Split layout on desktop (≥1024px): left panel is brand surface (indigo-600 background, or a
very subtle indigo-tinted gradient, with the wordmark and one short supporting line — e.g.
"Support, handled." — no stock photography, no illustration that isn't original); right panel
is the form, vertically centered, max-width ~380px.

```
┌───────────────────────┬─────────────────────────┐
│                       │                         │
│      Badi eSIM        │      Sign in            │
│                       │                         │
│    Support, handled.  │  Email                  │
│                       │  [                    ]  │
│                       │  Password                │
│                       │  [                    ]  │
│                       │                         │
│                       │  [      Sign in       ]  │
│                       │                         │
└───────────────────────┴─────────────────────────┘
```

Below 1024px, the left panel collapses to a compact top band (wordmark + tagline only), form
takes the full width beneath it.

**Fields:** Email (type `email`, autofocus), Password (type `password`, with a show/hide
toggle icon). **Primary CTA:** "Sign in" (`lg` button, full width of the form column).

**States:**
- *Idle* — as above.
- *Client validation* — inline, on blur and on submit: "Enter your email address.",
  "Enter your password."
- *Submitting* — button shows its loading state, both fields disabled.
- *Invalid credentials* — one calm inline banner above the form fields: "Incorrect email or
  password." (deliberately the same message regardless of which was wrong — this is a UX
  choice worth carrying into the backend implementation, not just cosmetic).
- *Network error* — same banner slot: "Can't reach the server. Check your connection and try
  again," with the form still editable.

No "Forgot password," no "Create account," no social login — the assignment does not call for
them and adding them would be dishonest scope (see the note at the top of this document).

---

## 10. Agent ticket inbox (Support Tickets)

The primary agent screen and the strongest UI in the application.

```
Support Tickets                                              [+ New Ticket]
Manage customer conversations, assignments and support workflows.

[Search tickets…]  [Status ▾] [Priority ▾] [Category ▾] [Assignee ▾]   Clear filters

┌──────────────────────────────────────────────────────────────────────────┐
│ Ticket   Subject                         Customer   Category  Priority  Status        Assignee  Updated │
├──────────────────────────────────────────────────────────────────────────┤
│ BD-1001  eSIM installed but no internet  Sara A.    CONNECT…  ● HIGH    ● In Progress  (AK) Anas  10m ago │
│ BD-1002  Cannot activate my eSIM         Omar H.    ACTIVAT…  MEDIUM    Open            —         1h ago  │
│ BD-1003  Refund request…                 Yusuf I.    REFUND    ● URGENT  Waiting…        (RU) Rahim 2h ago │
└──────────────────────────────────────────────────────────────────────────┘
                                              ‹ Previous   Page 1 of 3   Next ›
```

**Header:** page title "Support Tickets" (`display`), one-line subtitle in `slate-500`
("Manage customer conversations, assignments and support workflows."), primary "New Ticket"
button top-right.

**Toolbar:** a search input (icon-prefixed, placeholder "Search tickets…", debounced ~300ms,
searches ticket number/subject/description — matches the real backend's `search` param), then
four filter dropdowns — Status, Priority, Category, Assignee — each showing its own label when
unset ("Status") and the chosen value when set ("Status: Open"). When any filter or the search
box is active, a "Clear filters" ghost button appears at the end of the toolbar. Active filters
may optionally be echoed as small removable chips below the toolbar ("Status: Open ×",
"Priority: High ×") for scanability when several are combined — keep this row to one line;
wrap only if it must.

**Table columns:** Ticket (mono, links to detail), Subject (truncates with an ellipsis and a
native `title` tooltip, never wraps to a second line), Customer (name, not raw email, in the
table — email is reserved for the detail header), Category (plain text, `slate-500`), Priority
(badge), Status (badge), Assignee (avatar + first name, or an em dash "—" for unassigned, never
a blank cell), Updated (relative time, e.g. "10m ago", with the absolute timestamp in a
tooltip/`title`).

**Row behavior:** entire row is a link/button (keyboard-focusable, `Enter`/`Space` activates),
subtle `slate-50` hover fill, `focus-ring` on keyboard focus, cursor pointer. Rows are
comfortably tall (48–52px) — a scanning agent should never feel cramped.

**Pagination:** centered below the table, Previous/Next plus "Page X of Y", disabled state at
the boundaries. No infinite scroll — this is a work-queue tool, not a feed; agents need to know
where they are.

**Mobile (<768px):** each ticket becomes a card — ticket number + status badge on the first
line, subject on the second (bold), then a `caption`-sized row of category · priority ·
assignee · updated time, wrapping naturally. Cards are full-width, stacked with 8px gaps,
1px `slate-200` border, no shadow (shadow-xs only on hover/press, since touch has no hover).

---

## 11. Create ticket

**A dedicated page** (`/tickets/new`), not a modal — creating a ticket is a deliberate act with
several required fields; a full page gives it room to breathe and gives validation errors
space, and it means the URL is shareable/bookmarkable mid-draft. (A modal is acceptable only if
the generation tool strongly prefers it; if so, keep it non-dismissible-by-accident — confirm
before closing a modal with unsaved input.)

```
← Back to tickets

Create Ticket
Describe the issue so a support agent can help.

Customer email *          [                              ]
Order ID (optional)       [                              ]
Category *                [ Select category            ▾ ]
Subject *                 [                              ]
Description *              [                              ]
                            [                              ]
Priority *                 [ Select priority             ▾ ]

                                    [ Cancel ]  [ Create Ticket ]
```

**Fields**, all matching the backend exactly: Customer email (required, email format; for a
customer user this is pre-filled with their own email and shown read-only — the backend only
accepts their own email from a customer anyway; for an agent it's editable, with helper text
"Create on behalf of this customer."), Order ID (optional, placeholder `ORD-10293`), Category
(required select: Installation, Activation, Connectivity, Order, Top-up, Refund, Other),
Subject (required, single-line, max length matches the backend's — show a small character
counter only once the user is within ~20 characters of the limit, not from the first
keystroke), Description (required, multi-line, min height ~120px, grows with content),
Priority (required select: Low, Medium, High, Urgent — no default selected, forcing a
deliberate choice).

**Validation:** inline, on blur and on submit — "Enter a valid email address.", "Choose a
category.", "Subject is required.", "Describe the issue.", "Choose a priority." Submit button
disabled until the form has no client-visible errors is *not* required — better UX is: submit
is always clickable, and clicking with invalid data reveals the errors and focuses the first
invalid field (avoids a mysteriously-disabled button the user can't figure out).

**Submit states:** "Create Ticket" → "Creating…" (loading) → success toast "Ticket created:
BD-1009" → navigate to that ticket's detail page after a brief pause. On a backend error (for
example a customer trying to submit another person's email, or invalid category), show the
backend's message as an inline banner above the form and keep every typed value intact.

---

## 12. Ticket detail — layout

The most important screen; the workspace where all the real work happens.

```
← Back to tickets

BD-1001                                                     ● Live
eSIM installed but no internet

┌───────────────────────────────────────────┬──────────────────────────┐
│                                             │  Ticket details          │
│  [ Order summary card, if order_id set ]   │  Status      [ ▾ ]       │
│                                             │  Priority    [ ▾ ]       │
│  Conversation                              │  Assignee    [ ▾ ]       │
│  ─────────────────────────────             │  Category    CONNECT…    │
│  10:30 AM  Customer                        │                          │
│  My eSIM is installed but internet is      │  Customer                │
│  not working.                              │  sara@example.com        │
│                                             │                          │
│  10:35 AM  Anas · Support                  │  History          ▾      │
│  Are you currently in Turkey?              │  ● 10:45 Status changed  │
│                                             │    OPEN → IN_PROGRESS    │
│  10:40 AM  Customer                        │  ● 10:46 Assigned to     │
│  Yes.                                      │    Anas                  │
│                                             │  ● 11:12 Priority        │
│  10:44 AM  🔒 Internal note                 │    changed MEDIUM → HIGH │
│  Escalated to upstream provider for        │                          │
│  status verification.                      │                          │
│                                             │                          │
├─────────────────────────────────────────────┤                          │
│ [ Reply ▾ ]                                │                          │
│ [ Type a reply…                          ] │                          │
│                                    [ Send ]│                          │
└───────────────────────────────────────────┴──────────────────────────┘
```

**Desktop (≥1024px):** two columns — conversation (flex, ~65–70% width, the visual focus) and
a fixed-width (~320px) right sidebar of ticket details/controls/history, both scrolling
independently if content overflows; the composer is pinned to the bottom of the conversation
column, not the whole page, so it's always reachable without scrolling past the sidebar.

**Tablet (768–1023px):** sidebar narrows to ~260px and the conversation column's max text width
tightens; if that's still cramped, stack sidebar below the conversation instead of beside it —
prefer readability over forcing two columns.

**Mobile (<768px):** single column. Order: header → conversation → composer → then ticket
details/controls/history collapsed into an expandable "Ticket details" section below the
composer (a customer, who has no controls to operate, instead sees a much shorter "About this
ticket" summary here — order id, category, status — read-only).

**Header:** a "← Back to tickets" link, then ticket number (`mono`, `title` size) + the
connection indicator (§7) aligned to the right of that same line, then the subject (`display`
size) on its own line below. No status/priority badges duplicated in the header — they live in
the sidebar's "Ticket details" panel as the single source of truth on screen, to avoid two
places that could show as out of sync for a fraction of a second after an update.

---

## 13. Conversation

Oldest message first, reading top-to-bottom like any chat/email thread. A date separator
("Today", "Yesterday", or a full date) appears whenever the day changes between two consecutive
messages, in `caption`/`slate-400`, centered, with a thin rule on either side.

**Message anatomy** (every message, regardless of type):

```
[Avatar]  Sender name · Role            10:30 AM
          Message body, wrapped and readable,
          preserving line breaks the sender typed.
```

- **Avatar** — 32px, per §7.
- **Sender name** — `body-md`. **Role** appears next to it in `caption`/`slate-500` as plain
  text — "Sara Ahmed · Customer" or "Anas Karim · Support" — never inferred from bubble color
  alone.
- **Timestamp** — right-aligned on the same line as the name on desktop, `caption`, absolute
  time (e.g. "10:30 AM") with the full date in a `title` tooltip; on mobile it drops to a
  second line under the name if space is tight.
- **Body** — `body-lg`, `white-space: pre-wrap` (preserve the sender's line breaks; never
  render as HTML), max width per §5.

**Customer messages:** white/`slate-50` bubble, `slate-200` border, left-aligned avatar.

**Agent replies (`REPLY` from an `AGENT` sender):** `indigo-50` bubble, no border needed (the
tint alone is enough contrast against the page background), same left-aligned layout as
customer messages — **do not** mirror them to the right like a consumer chat app; this is a
shared support record both parties read top-to-bottom, not a two-person SMS thread, and a
support agent may be looking at a ticket where they are not the one who last replied.

**Internal notes (`INTERNAL_NOTE`):** visually unmistakable — `#FFFBEB` (amber-50) background,
`1px dashed #FDE68A` (amber-200) border (dashed, specifically, to read as "not part of the
normal record" at a glance), a small lock icon + "Internal note" label in `caption`/amber-700
in place of the "· Role" text, positioned exactly where every other message's role indicator
sits, so the *pattern interrupt* is immediate. Internal notes are **never** shown to a customer
session at all — not grayed out, not collapsed, not present in the DOM — full omission (this
must hold even if a message somehow arrived over the realtime channel; see §19).

**Empty conversation:** centered empty state (§7) — "No messages yet." / "Start the
conversation with the customer." — no action button needed here, the composer right below it
is the action.

**Auto-scroll:** the thread scrolls to the newest message on initial load and whenever a new
message is added (sent or received live), *unless* the reader has scrolled up to read earlier
history, in which case show a small "↓ New message" pill above the composer instead of
yanking their scroll position.

---

## 14. Message composer

Pinned to the bottom of the conversation column, `lg`-radius card, `shadow-xs`, 1px
`slate-200` top border separating it from the thread above.

**Agent view:**

```
┌──────────────────────────────────────────────────────┐
│ [ Reply ]  [ Internal note ]                          │
│ ┌────────────────────────────────────────────────┐    │
│ │ Type a reply…                                   │    │
│ └────────────────────────────────────────────────┘    │
│                                             [ Send ]   │
└──────────────────────────────────────────────────────┘
```

A two-segment control ("Reply" / "Internal note") at the top of the composer — the selected
segment is filled `indigo-600`/white (Reply) or filled amber-600/white (Internal note, so the
composer itself visually warns the agent which mode they're in before they even type),
unselected segment is plain text. Switching modes changes: the textarea placeholder ("Type a
reply…" ↔ "Type an internal note — visible to agents only…"), the Send button's label ("Send" ↔
"Add note"), and the Send button's color (indigo ↔ amber) — three simultaneous, redundant
signals so a tired agent can't accidentally send a customer-visible reply while meaning to
write a private note, or vice versa.

**Customer view:** identical shell, minus the segment control entirely (not disabled — absent
— a customer never has an "Internal note" option to be tempted by or curious about). Textarea
placeholder is just "Type a reply…", Send button always indigo.

**Composer states:**

- *Empty* — Send disabled (not "grayed out and still clickable with an error" — genuinely
  disabled; there is nothing meaningful to validate here beyond non-empty).
- *Typing* — Send enabled once there's non-whitespace content.
- *Sending* — Send shows its loading state ("Sending…" / "Adding…"), textarea disabled so the
  user can't edit mid-request.
- *Success* — textarea clears, focus returns to it, a brief unobtrusive confirmation (the
  message simply appearing in the thread above is confirmation enough; a toast is optional and
  should not be required reading).
- *Error* — textarea re-enables **with the typed text preserved** (never make someone retype a
  reply after a failed send), a `danger` inline line appears just above the toolbar: "Unable to
  send message. Please try again." — plus a toast, since this is important enough to also
  surface outside the immediate viewport if they've scrolled.
- *Disabled* — not applicable to sending in general, but the composer as a whole should never
  be disabled outright; if the ticket is `CLOSED`, still allow replies (support tickets often
  get reopened by a follow-up) rather than blocking the composer, unless product rules say
  otherwise — that's a product decision, not a design one, and defaults to "allow" here.

---

## 15. Ticket controls (right sidebar, top section)

Compact, information-rich, no wasted vertical space — this is a control panel, not a content
section.

```
Ticket details
──────────────
Status        [ In Progress            ▾ ]
Priority      [ High                    ▾ ]
Assignee      [ Anas Karim              ▾ ]   Assign to me
Category       CONNECTIVITY

Customer
sara@example.com
```

**Status / Priority / Assignee** are native-feeling dropdowns (label left or above, control
right — pick one alignment and hold it for all three), each control:

- Shows its current value at rest.
- On change, the control itself shows a small inline spinner/"Saving…" replacing its chevron
  (not a full-panel overlay — this must feel lightweight, per the brief's own instruction),
  and disables just that one control (the other two remain usable — they're independent
  requests).
- On success, updates immediately to the new value and the History section (§17) gains a new
  entry without a page reload.
- On failure (for example a rejected status transition), the control **reverts to its previous
  value**, and a `danger` inline note appears directly beneath that specific control with the
  backend's real message (e.g. "A ticket cannot move from Open to Closed.") — errors are
  scoped to the control that caused them, never a generic top-of-page banner for this.

**Status options** are not "all six statuses always" — only the current status plus its valid
next states are offered (the UI presents a curated list; the backend is still the final
authority and can reject anything — see the note in §24). **Assignee** includes an "Assign to
me" one-click shortcut next to the dropdown for the common case.

**Category** is shown as plain read-only text here (categories aren't reassigned after
creation in this product). **Customer** shows the email as plain text (not editable from this
panel).

For a **customer** viewing their own ticket, this entire "Ticket details" controls block does
not render controls at all — replace it with a compact read-only summary: Status (badge),
Priority (badge), Category (text). No Assignee row at all (see §19).

---

## 16. Order summary

Only rendered when the ticket has an `order_id`. A small, clearly-bounded card — it must never
compete visually with the conversation or the controls above it.

```
Order  ORD-10293
────────────────
Destination     Turkey
Package         10 GB
Order status    Completed
eSIM            Installed
```

Card title is the order id itself (`mono`), four label/value rows below (`caption` label,
`body` value), no icons needed, no action buttons — this is read-only reference material. Its
own small loading state ("Loading order…") and its own small error state ("Order details
unavailable") that **never** blocks or hides the rest of the ticket detail page if it fails —
this card is allowed to fail alone.

---

## 17. Audit timeline

A compact, collapsible section in the sidebar, **agent-only** (never rendered for a customer —
not collapsed-and-hidden, simply not in that session's markup at all).

```
History                                    ▾
──────
●  10:45
   Status changed
   Open → In Progress

●  10:46
   Assignment changed
   Assigned to Anas

●  11:12
   Priority changed
   Medium → High
```

Newest or oldest first is a legitimate either-way choice; recommend **oldest first**, matching
the conversation's reading order, so an agent scanning both together sees one consistent
timeline direction. Each entry: a small filled dot (`slate-400`, or tinted to match the
relevant badge color — e.g. the new status's color — for a nice-to-have touch) connected to the
next by a thin vertical `slate-200` line (classic timeline connector), timestamp in `caption`,
a one-line human sentence built from the event type and its old/new values (exactly the
patterns the backend's own event types produce: "Status changed: X → Y", "Assigned to: Name",
"Priority changed: X → Y"). Collapsed by default on first load (chevron rotates on toggle) to
keep the sidebar short for tickets with a long history; remembering the open/closed state
across a session (not persisted beyond it) is a nice-to-have, not required.

---

## 18. (Reserved — merged into §16 Order summary above to avoid duplicating the same card twice under two numbers.)

---

## 19. Customer experience

The customer role is **not** a cut-down version of the agent app visually — it is the *same*
shell, same components, same conversation design — simply missing everything that isn't
theirs to see or do:

**Sidebar:** only "My Tickets" (no "Customers", no "Settings" placeholders for this role —
those are agent-facing concepts).

**Ticket list ("My Tickets"):** the same table component as the agent inbox, but with the
Customer and Assignee columns removed (a customer's own tickets are all their own; who they're
assigned to internally isn't their concern) and only a Status filter (no Priority/Category/
Assignee filters — those exist to help an agent triage a shared queue, not to help a customer
search their own handful of tickets). "New Ticket" primary button, same as the agent's, since
customers create tickets too.

**Ticket detail:** identical page structure to §12, but:
- No Status/Priority/Assignee dropdowns — replaced by the read-only summary described at the
  end of §15.
- No "History" section at all (§17 is agent-only).
- The composer never shows the Reply/Internal-note segment control (§14) — always plain Reply.
- The conversation thread the customer receives from the API will simply never contain an
  `INTERNAL_NOTE` message in the first place — but the frontend must **also** independently
  refuse to render one if it ever saw one (defense in depth, matching §24's realtime note) —
  this is a design requirement, not just a backend guarantee to trust blindly.

**Tone:** the customer's empty/error copy can be slightly warmer than the agent's terser,
work-queue tone — "No tickets found. Need help with something? Create a ticket and we'll get
back to you." — while staying just as honest and free of exclamation-mark enthusiasm.

---

## 20. Responsive behavior

Design and verify at: **390px** (mobile), **768px** (tablet portrait), **1024px** (tablet
landscape / small laptop), **1280px** (laptop), **1440px** (desktop), **2560px** (large
desktop — content should cap at a comfortable max-width, e.g. 1400–1600px, and center, rather
than stretching every table to full ultrawide width).

| Breakpoint | Shell | Ticket list | Ticket detail |
|---|---|---|---|
| ≥1024px | Fixed sidebar + header | Table | Two columns (conversation + sidebar) |
| 768–1023px | Fixed sidebar (narrower) or drawer, tool's choice | Table (tighter columns; consider dropping the Category column first if it must shrink) | Two columns, narrower sidebar, or stacked if that's tighter |
| <768px | Drawer nav, header keeps wordmark + hamburger | Cards (§10) | Single column, controls collapse into an expandable section (§12) |

No screen may produce horizontal scrolling of the page itself at any of these widths (a wide
data table is the one exception, and only if it ever needs one — this app's table should not,
given the column set specified in §10).

---

## 21. Loading states

Every async view has a **skeleton**, not a spinner or a blank screen, matching the real
layout's geometry:

- **Ticket list:** 6–8 skeleton rows with shimmering blocks where the ticket number, subject,
  badges, and avatar would be — same row height as real rows, so the layout doesn't jump when
  data arrives.
- **Ticket detail:** a skeleton header (two shimmering lines), 3–4 skeleton message blocks of
  varying width in the conversation column, a skeleton sidebar panel.
- **Order summary card:** its own small skeleton (label/value rows), independent of the rest
  of the page's loading state (per §16).
- **Buttons:** the loading state described in §7 (label changes to a verb-ing form, spinner,
  same width) — used for every submit action (send message, save a control change, create
  ticket, sign in).

No screen shows a centered full-page spinner as its primary loading treatment — that's the one
thing explicitly avoided here.

---

## 22. Empty states

Product-specific, never generic "No data." Examples, matching the real filter/search vocabulary
from §10:

- **Ticket list, no tickets at all:** "No tickets found." / for a customer: add "Create a
  ticket and we'll get back to you." with a "Create Ticket" button; for an agent, no button
  needed (an agent isn't the one who'd create the first ticket in an empty system, typically).
- **Ticket list, filtered to nothing:** "No tickets match your filters." / "Try adjusting your
  filters or clearing them." with a "Clear filters" button — this must read as visually
  distinct from "no tickets at all" (different copy, same layout) so an agent never mistakes
  an over-filtered view for an empty queue.
- **Conversation, no messages:** "No messages yet." / "Start the conversation with the
  customer." (§13).

---

## 23. Error states

Each error state names the problem in plain language and offers exactly one clear next step —
never a raw backend message, stack trace, or HTTP status code shown to the user.

| Situation | Message | Action |
|---|---|---|
| Ticket list fails to load | "Unable to load tickets." | "Try again" (retries the same request) |
| A single ticket fails to load | "Unable to load this ticket." | "Try again" |
| Ticket truly not found / not yours | "Ticket not found." | "Back to tickets" |
| Sending a message fails | inline + toast, "Unable to send message. Please try again." | text is preserved, just retry the Send |
| A status/priority/assignee change fails | inline beneath that control, the backend's real message (§15) | control reverts, user can retry |
| Order summary fails | "Order details unavailable." (§16) | none — non-blocking, no retry needed, it's supplementary |
| Session expired / unauthorized | "Your session has expired." | "Sign in again" → login screen |
| Network unreachable | "Can't reach the server. Check your connection and try again." | "Try again" |

---

## 24. Interaction details

- **Hover:** subtle background shift only (`slate-50` on rows/list items, one shade darker on
  filled buttons) — no scale, no shadow pop.
- **Focus:** every interactive element gets the visible `focus-ring` from §4 — this is not
  optional for keyboard users; never remove the browser's default focus outline without
  replacing it with an equally visible one.
- **Dropdowns/menus:** open with a quick fade + 4px slide (120–150ms), close instantly on
  selection or outside click.
- **Modal (if used at all):** fade + scale-from-98% (150ms), backdrop fades in slightly slower
  than the modal itself so the modal feels like it's arriving, not just appearing.
- **Toast:** slide up + fade in (150ms), slide down + fade out on dismiss.
- **New message arriving:** a brief (200ms) fade/slight-slide-in as it's appended to the
  thread — enough to catch the eye without feeling gimmicky; **never** replay this animation
  for messages already present when the page loaded, only for ones that arrive live.
- **Sidebar collapse:** width transitions (200ms), icon-only labels fade out just before the
  width finishes animating (not simultaneously, or labels look like they're being crushed).
- **All durations 120–250ms**, `ease-out` for things entering/expanding, `ease-in` for things
  leaving/collapsing. Respect `prefers-reduced-motion`: cut all of the above to instant
  (no transition) when it's set.
- **Realtime discipline (ties to §19):** the frontend must never render an incoming
  realtime event whose message type is `INTERNAL_NOTE`, even though the backend is not
  expected to ever send one to a customer connection — treat that as a defense-in-depth rule
  for whoever wires up the WebSocket, not just a backend guarantee to take on faith.
- **Status/priority control discipline (ties to §15):** the dropdown only *offers* valid next
  states as a convenience; the backend remains the actual authority and can still reject a
  choice (for example if it was changed from another tab in the meantime) — that rejection
  must always be shown to the user, never silently ignored or retried without telling them.

---

## 25. Complete user flows

**Agent — triage and resolve a ticket:**
Sign in → land on Support Tickets → filter to `Status: Open` → click a row → read the
conversation and order summary → set Assignee to "Assign to me" → set Status to
`In Progress` → send a customer-visible reply asking a clarifying question → add an internal
note documenting an internal escalation → customer's reply arrives live, no refresh → raise
Priority in response → once resolved, set Status to `Resolved`, later `Closed` → the History
panel now shows the full chain of what happened and when.

**Customer — open and follow a case:**
Sign in → land on My Tickets (their own tickets only) → click "New Ticket" → fill the form →
submit → arrive on the new ticket's detail page, status `Open` → later, an agent's reply
arrives live in the conversation with no page refresh → reply back → never see, and have no
way to trigger, an internal note or any status/assignee control.

**Error recovery — a rejected status change:**
Agent selects `Closed` from a ticket that's still `Open` → control shows "Saving…" → backend
rejects the transition → control reverts to `Open`, an inline message appears beneath it
explaining the ticket cannot move directly from Open to Closed → agent instead selects the
actually-valid next state.

**Session loss:**
An API call comes back unauthorized mid-session (for example the token expired) → the app
clears local session state, shows "Your session has expired." and returns to the login screen
→ after signing in again, the user is returned to the page they were on, not dumped back to the
inbox from wherever they were.

---

## 26. Pen.dev implementation prompt

*(This is the single consolidated prompt — everything above distilled into one generation
instruction. Paste this block, as-is, into Pen.dev.)*

```
Build "Badi eSIM Support," a premium SaaS support-ticketing web app, in React + TypeScript +
Tailwind CSS. It must look like a real, polished product a professional design team shipped —
not a generic admin/CRUD template, not overly colorful, no fake charts or metrics anywhere.

DESIGN SYSTEM
Brand: one accent color, indigo-600 #4F46E5 (hover indigo-700 #4338CA, tint indigo-50 #EEF2FF,
indigo-100 #E0E7FF). Neutrals: slate scale from #FAFBFC (app background) through #0F172A
(darkest text), borders at slate-200 #E2E8F0. Typeface: Inter. Type scale: page titles 24/32
weight 700, section titles 18/26 weight 600, body 14/20 weight 400, labels/captions 13/18 and
12/16 weight 500. Spacing scale: 4,8,12,16,20,24,32,40,48,64px. Radius: 6px small controls,
8px cards/buttons, 12px modals, full-round badges/avatars. Shadows are subtle
(0 1px 2px rgba(15,23,42,.04) resting, 0 8px 24px rgba(15,23,42,.10) modals) — borders do most
of the separating, not shadows. Every focusable element gets a visible indigo focus ring.
Build once: Button (primary/secondary/ghost/danger, sm/md/lg, loading + disabled states),
Input/Textarea/Select (with label, helper text, error state), Badge (status + priority
colors below, text label always shown, never color-only), Avatar (initials, deterministic
color per user id), Card, Modal, Toast (bottom-right, danger/success left-border accent,
auto-dismiss + manual close), Skeleton (shaped to match real content), EmptyState, ErrorState
(with a working "Try again"), Tooltip, a small "● Live / ● Reconnecting… / ○ Offline"
connection indicator.

STATUS COLORS: OPEN slate/neutral badge · IN_PROGRESS indigo badge · WAITING_FOR_CUSTOMER
amber badge · WAITING_FOR_PROVIDER orange badge · RESOLVED green badge · CLOSED gray badge.
PRIORITY COLORS: LOW slate/neutral · MEDIUM indigo · HIGH orange · URGENT red, bold.

APP SHELL: fixed left sidebar (240px, collapsible to a 72px icon rail) with the "Badi eSIM"
wordmark, a short nav ("Tickets"; optional disabled "Customers"/"Settings" placeholders), and
a bottom block showing the current user's avatar, name, role badge, and Logout. Top header
bar with page title, a ticket search field, and the user menu on the right. On mobile
(<768px) the sidebar becomes a drawer opened from a hamburger in the header.

SCREENS (build all of these; two roles, AGENT and CUSTOMER, sharing this same shell/components
— the customer view is the same visual language with agent-only controls removed, never a
visually lesser app):

1. LOGIN — split layout, left brand panel (indigo background, wordmark, one short tagline, no
   stock imagery), right a centered email + password form, "Sign in" primary button (large),
   inline validation, an invalid-credentials banner, a network-error state, loading state on
   submit. No registration, no social login, no "forgot password."

2. TICKET INBOX ("Support Tickets" for agents / "My Tickets" for customers) — page title +
   one-line subtitle, "New Ticket" button top-right, a toolbar with a debounced search field
   and (agent only) Status/Priority/Category/Assignee filter dropdowns plus a "Clear filters"
   button that appears only when something is active, customers get only a Status filter. A
   dense but airy table: Ticket# (monospace) · Subject (truncated) · Customer (agent view
   only) · Category · Priority badge · Status badge · Assignee avatar+name or "—" (agent view
   only) · Updated (relative time, absolute in a tooltip). Whole rows are clickable/keyboard-
   focusable with a subtle hover fill. Pagination centered below (Previous / Page X of Y /
   Next). On mobile, rows become stacked cards. Loading = skeleton rows. Empty (no tickets) vs
   empty-from-filters (different copy, both with a relevant action) are visually distinct.
   Error state has a working retry.

3. CREATE TICKET — its own page (not a modal), fields: Customer email (read-only + prefilled
   for a customer, editable for an agent with "create on behalf of" helper text), Order ID
   (optional), Category (select), Subject, Description (textarea), Priority (select, no
   default). Inline validation per field, submit always clickable (reveals + focuses first
   error rather than staying disabled), loading state "Creating…", success toast
   "Ticket created: BD-xxxx" then navigate to the new ticket, server errors shown inline with
   form values preserved.

4. TICKET DETAIL — the core screen. Header: "← Back to tickets", ticket number + live
   connection indicator on one line, subject as a large title below. Two-column desktop layout
   (conversation ~65-70% width on the left, a ~320px sidebar on the right), single column on
   mobile with the sidebar's content collapsed into an expandable section beneath the
   composer. If the ticket has an order id, show a small compact read-only order card (order
   id, destination, package, status, eSIM status) above the conversation, with its own
   independent skeleton/error state that never blocks the rest of the page.

   CONVERSATION: oldest-first thread, date separators between days, each message shows an
   avatar, "Sender name · Role", a right-aligned timestamp, and the body (preserve line
   breaks, plain text only, never render as HTML). Customer messages: white/slate-50 bubble.
   Agent replies: indigo-50 tinted bubble. BOTH LEFT-ALIGNED (not a two-sided chat mirror —
   this is a shared support record). INTERNAL NOTES get an unmistakably different treatment:
   amber-50 background, dashed amber-200 border, a small lock icon + "Internal note" label
   where the role text normally sits. Internal notes must never appear in a customer's view
   under any circumstance, including over the realtime channel. Auto-scroll to the newest
   message unless the reader has scrolled up, in which case show a "↓ New message" pill
   instead. Empty conversation shows an empty state ("No messages yet.").

   COMPOSER: pinned to the bottom of the conversation column. Agents get a two-segment
   Reply/Internal-note toggle above the textarea — the selected segment, the placeholder text,
   and the Send button's label+color all change together (indigo for Reply, amber for
   Internal note) so the current mode is unmistakable. Customers get the same shell with no
   toggle, always Reply. Send is disabled when empty, shows a loading state while sending,
   clears and refocuses on success, and on failure re-enables WITH the typed text preserved
   plus an inline+toast error ("Unable to send message. Please try again.").

   SIDEBAR (agent): a "Ticket details" panel with Status/Priority/Assignee as dropdowns
   (Status offers only the valid next states for the current status, not all six always) plus
   an "Assign to me" shortcut, and read-only Category + Customer email. Each control shows its
   own small inline "Saving…" state on change, reverts to its previous value and shows an
   inline error message from the server if the change is rejected (for example an invalid
   status transition), independent of the other controls. Below that, a collapsible "History"
   timeline (dot + connector style) built from real audit events, oldest-first, one line each:
   "Status changed: X → Y", "Assigned to: Name", "Priority changed: X → Y", with timestamps.
   SIDEBAR (customer): no controls, no history — just a compact read-only Status/Priority/
   Category summary instead.

REALTIME: a WebSocket-driven live update to the conversation when the other party sends a
message — no page refresh, append it into the thread in place, ignore/dedupe anything already
shown. Show the "● Live / Reconnecting… / Offline" indicator near the ticket header, reflecting
real connection state. No typing indicators, no presence, no read receipts — explicitly out of
scope.

STATES (design and build all of these, everywhere they apply, not just the happy path):
loading → shaped skeletons, never a bare spinner or blank screen; empty → specific, helpful
copy plus a relevant single action, visually distinct from an error; error → plain-language
message plus one clear action (a working "Try again" wherever a request can be retried), never
a raw backend/HTTP error shown to the user; disabled/saving states on every button and control
that triggers a request.

RESPONSIVE: verify and make usable at 390, 768, 1024, 1280, 1440, and 2560px — no page-level
horizontal scrolling at any width. Sidebar → drawer, table → cards, two-column detail →
single-column, below 768px.

MOTION: fast and subtle only — 120–250ms fades/slides on toasts, dropdowns, modals, sidebar
collapse, and newly-arrived (only newly-arrived) messages. Respect prefers-reduced-motion by
disabling all of it.

ACCESSIBILITY: visible focus rings on every interactive element, real form labels, semantic
table markup with column headers, keyboard-operable dropdowns and modals, color never used as
the only signal (status/priority badges always carry a text label), sufficient text contrast
throughout.

Treat this as one coherent product across every screen — same components, same spacing rhythm,
same voice in the copy — not a set of independently generated pages.
```

---

*End of specification. The file lives at `docs/frontend-design-spec.md` in the repository for
future reference alongside `plan.md`, `AGENTS.md`, and `docs/agent-tasks.md`.*
