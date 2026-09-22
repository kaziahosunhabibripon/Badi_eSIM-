"""Demo data for the Badi eSIM Support Ticketing API (plan section 35).

Run from backend/, against the database DATABASE_URL points at (normally the
development database, badi_support - never badi_support_test, which pytest manages
itself and truncates on every run):

    python seed.py            # only runs if the database has no users yet
    python seed.py --reset    # also wipes the 4 data tables first

Seeded data:
  - 3 agents (Anas, Rahim, Farah) and 5 customers.
  - 8 tickets, BD-1001 through BD-1008, covering every status, priority and category
    at least once (plan section 35). Ticket BD-1001 mirrors the assignment's own
    example exactly: customer, order, category, subject, and its example conversation
    and audit trail.
  - Messages (including internal notes) and audit events with explicit, staggered
    created_at values, so the demo does not look like everything happened in one instant.

Tickets are inserted through TicketRepository.get_next_ticket_number(), the same
PostgreSQL sequence the API uses (plan section 8), so the next ticket a real user
creates afterwards continues the series at BD-1009 rather than colliding with seed data.
"""
import argparse
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy import text  # noqa: E402

from app.core.database import SessionLocal, engine  # noqa: E402
from app.models.ticket import Ticket  # noqa: E402
from app.models.ticket_event import TicketEvent  # noqa: E402
from app.models.ticket_message import TicketMessage  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402
from app.repositories.ticket_repository import TicketRepository  # noqa: E402
from app.services.event_type import EventType  # noqa: E402

NOW = datetime.now(timezone.utc)


def ago(**delta) -> datetime:
    """A UTC timestamp `delta` before now, for readable relative times below."""
    return NOW - timedelta(**delta)


def reset_data(session) -> None:
    session.execute(
        text("truncate table ticket_events, ticket_messages, tickets, users restart identity cascade")
    )
    session.execute(text("alter sequence ticket_number_seq restart with 1"))
    session.commit()
    print("[reset] data tables truncated, ticket_number_seq restarted at 1")


def create_users(session) -> dict:
    agents = [
        User(email="anas@example.com", name="Anas Karim", role=UserRole.AGENT.value),
        User(email="rahim@example.com", name="Rahim Uddin", role=UserRole.AGENT.value),
        User(email="farah@example.com", name="Farah Ahmed", role=UserRole.AGENT.value),
    ]
    customers = [
        # customer@example.com is the assignment's own example e-mail (docx section 1).
        User(email="customer@example.com", name="Customer One", role=UserRole.CUSTOMER.value),
        User(email="sara@example.com", name="Sara Ahmed", role=UserRole.CUSTOMER.value),
        User(email="omar@example.com", name="Omar Hassan", role=UserRole.CUSTOMER.value),
        User(email="yusuf@example.com", name="Yusuf Ibrahim", role=UserRole.CUSTOMER.value),
        User(email="lina@example.com", name="Lina Chowdhury", role=UserRole.CUSTOMER.value),
    ]
    session.add_all(agents + customers)
    session.commit()
    for user in agents + customers:
        session.refresh(user)

    by_email = {u.email: u for u in agents + customers}
    print(f"[users] {len(agents)} agents, {len(customers)} customers")
    return by_email


def new_ticket(session, repo, *, customer, category, priority, status, subject, description,
                order_id=None, created_at) -> Ticket:
    ticket = Ticket(
        ticket_number=repo.get_next_ticket_number(),
        customer_id=customer.id,
        order_id=order_id,
        category=category,
        subject=subject,
        description=description,
        priority=priority,
        status=status,
        created_at=created_at,
        updated_at=created_at,
    )
    session.add(ticket)
    session.flush()
    return ticket


def add_message(session, ticket, *, sender, message_type, body, at) -> TicketMessage:
    message = TicketMessage(
        ticket_id=ticket.id, sender_id=sender.id, message_type=message_type, body=body, created_at=at
    )
    session.add(message)
    ticket.updated_at = at
    session.flush()
    return message


def add_event(session, ticket, *, actor, event_type, old_value, new_value, at) -> TicketEvent:
    event = TicketEvent(
        ticket_id=ticket.id, actor_id=actor.id, event_type=event_type.value,
        old_value=old_value, new_value=new_value, created_at=at,
    )
    session.add(event)
    ticket.updated_at = at
    session.flush()
    return event


def assign(session, ticket, *, agent, at) -> None:
    add_event(session, ticket, actor=agent, event_type=EventType.ASSIGNED, old_value=None, new_value=agent.name, at=at)
    ticket.assigned_agent_id = agent.id
    session.flush()


def change_status(session, ticket, *, actor, new_status, at) -> None:
    old_status = ticket.status
    add_event(session, ticket, actor=actor, event_type=EventType.STATUS_CHANGED, old_value=old_status, new_value=new_status, at=at)
    ticket.status = new_status
    if new_status == "RESOLVED":
        ticket.resolved_at = at
    elif new_status == "CLOSED":
        ticket.closed_at = at
    session.flush()


def change_priority(session, ticket, *, actor, new_priority, at) -> None:
    old_priority = ticket.priority
    add_event(session, ticket, actor=actor, event_type=EventType.PRIORITY_CHANGED, old_value=old_priority, new_value=new_priority, at=at)
    ticket.priority = new_priority
    session.flush()


def seed_tickets(session, users: dict) -> None:
    repo = TicketRepository(session)
    anas, rahim, farah = users["anas@example.com"], users["rahim@example.com"], users["farah@example.com"]

    # BD-1001 - mirrors the assignment's own example exactly (docx sections 1 and 3):
    # same customer, order, category, subject, and the same four-message conversation.
    # The audit trail matches plan.md's own illustrative example (section 11).
    t = new_ticket(
        session, repo,
        customer=users["customer@example.com"], category="CONNECTIVITY", priority="MEDIUM", status="OPEN",
        subject="eSIM installed but no internet",
        description="I installed the eSIM profile but I do not have a data connection.",
        order_id="ORD-10293", created_at=ago(days=2, hours=1, minutes=44),
    )
    assign(session, t, agent=anas, at=ago(days=2, hours=1, minutes=39))
    change_status(session, t, actor=anas, new_status="IN_PROGRESS", at=ago(days=2, hours=1, minutes=38))
    add_message(session, t, sender=users["customer@example.com"], message_type="REPLY",
                body="My eSIM is installed but internet is not working.", at=ago(days=2, hours=1, minutes=14))
    add_message(session, t, sender=anas, message_type="REPLY",
                body="Are you currently in Turkey?", at=ago(days=2, hours=1, minutes=9))
    add_message(session, t, sender=users["customer@example.com"], message_type="REPLY",
                body="Yes.", at=ago(days=2, hours=1, minutes=4))
    change_priority(session, t, actor=anas, new_priority="HIGH", at=ago(days=2, hours=1, minutes=2))
    add_message(session, t, sender=anas, message_type="INTERNAL_NOTE",
                body="Escalated to upstream provider for status verification.", at=ago(days=2, hours=1))

    # BD-1002 - fresh, unclaimed (plan section 35 example row).
    new_ticket(
        session, repo,
        customer=users["sara@example.com"], category="ACTIVATION", priority="MEDIUM", status="OPEN",
        subject="Cannot activate my eSIM",
        description="I purchased and installed the eSIM profile but activation keeps failing.",
        created_at=ago(days=1, hours=3),
    )

    # BD-1003 - waiting on the customer to confirm refund details.
    t = new_ticket(
        session, repo,
        customer=users["omar@example.com"], category="REFUND", priority="MEDIUM", status="OPEN",
        subject="Refund request for cancelled order",
        description="I would like a refund for an order that was never delivered.",
        created_at=ago(days=4, hours=6),
    )
    assign(session, t, agent=rahim, at=ago(days=4, hours=5, minutes=55))
    change_status(session, t, actor=rahim, new_status="IN_PROGRESS", at=ago(days=4, hours=5, minutes=54))
    add_message(session, t, sender=users["omar@example.com"], message_type="REPLY",
                body="It has been a week and I have not received my refund.", at=ago(days=4, hours=5, minutes=50))
    add_message(session, t, sender=rahim, message_type="REPLY",
                body="Sorry for the delay - could you confirm the bank account for the refund?",
                at=ago(days=4, hours=5, minutes=40))
    change_priority(session, t, actor=rahim, new_priority="URGENT", at=ago(days=4, hours=5, minutes=39))
    change_status(session, t, actor=rahim, new_status="WAITING_FOR_CUSTOMER", at=ago(days=4, hours=5, minutes=38))

    # BD-1004 - resolved (plan section 35 example row: "Top-up did not arrive").
    t = new_ticket(
        session, repo,
        customer=users["yusuf@example.com"], category="TOPUP", priority="LOW", status="OPEN",
        subject="Top-up did not arrive",
        description="I topped up 5 GB but my balance was not updated.",
        created_at=ago(days=5, hours=4),
    )
    assign(session, t, agent=farah, at=ago(days=5, hours=3, minutes=55))
    change_status(session, t, actor=farah, new_status="IN_PROGRESS", at=ago(days=5, hours=3, minutes=54))
    add_message(session, t, sender=farah, message_type="REPLY",
                body="This has been credited manually - please check your balance.",
                at=ago(days=5, hours=3, minutes=40))
    add_message(session, t, sender=users["yusuf@example.com"], message_type="REPLY",
                body="Confirmed, thank you!", at=ago(days=5, hours=3, minutes=30))
    change_status(session, t, actor=farah, new_status="RESOLVED", at=ago(days=5, hours=3, minutes=29))

    # BD-1005 - waiting on the eSIM provider.
    t = new_ticket(
        session, repo,
        customer=users["lina@example.com"], category="INSTALLATION", priority="MEDIUM", status="OPEN",
        subject="QR code will not scan during installation",
        description="The installation QR code fails every time I try to scan it.",
        created_at=ago(days=1, hours=2),
    )
    assign(session, t, agent=anas, at=ago(days=1, hours=1, minutes=50))
    change_status(session, t, actor=anas, new_status="IN_PROGRESS", at=ago(days=1, hours=1, minutes=49))
    add_message(session, t, sender=anas, message_type="REPLY",
                body="Let me check with the provider on this QR code batch.", at=ago(days=1, hours=1, minutes=40))
    change_status(session, t, actor=anas, new_status="WAITING_FOR_PROVIDER", at=ago(days=1, hours=1, minutes=39))

    # BD-1006 - closed, a repeat customer (Sara has two tickets, which is realistic).
    t = new_ticket(
        session, repo,
        customer=users["sara@example.com"], category="ORDER", priority="HIGH", status="OPEN",
        subject="Wrong package delivered",
        description="I ordered the 20 GB package but received a 10 GB eSIM.",
        created_at=ago(days=8),
    )
    assign(session, t, agent=rahim, at=ago(days=7, hours=23, minutes=50))
    change_status(session, t, actor=rahim, new_status="IN_PROGRESS", at=ago(days=7, hours=23, minutes=49))
    add_message(session, t, sender=rahim, message_type="REPLY",
                body="Apologies for the mix-up - we have upgraded your plan to 20 GB.",
                at=ago(days=7, hours=22))
    add_message(session, t, sender=users["sara@example.com"], message_type="REPLY",
                body="Great, thank you!", at=ago(days=7, hours=21, minutes=50))
    change_status(session, t, actor=rahim, new_status="RESOLVED", at=ago(days=7, hours=21, minutes=49))
    change_status(session, t, actor=rahim, new_status="CLOSED", at=ago(days=6))

    # BD-1007 - fresh, unclaimed.
    new_ticket(
        session, repo,
        customer=users["omar@example.com"], category="OTHER", priority="LOW", status="OPEN",
        subject="General question about coverage",
        description="Does this eSIM work in rural areas of Germany?",
        created_at=ago(hours=3),
    )

    # BD-1008 - urgent and actively being worked, with an internal note (plan section 11
    # example wording, adapted).
    t = new_ticket(
        session, repo,
        customer=users["yusuf@example.com"], category="CONNECTIVITY", priority="URGENT", status="OPEN",
        subject="No signal since this morning",
        description="My eSIM has had no signal since this morning and I have important calls to make.",
        created_at=ago(hours=5),
    )
    assign(session, t, agent=farah, at=ago(hours=4, minutes=55))
    change_status(session, t, actor=farah, new_status="IN_PROGRESS", at=ago(hours=4, minutes=54))
    add_message(session, t, sender=farah, message_type="REPLY",
                body="We are investigating a network issue in your area.", at=ago(hours=4, minutes=40))
    add_message(session, t, sender=farah, message_type="INTERNAL_NOTE",
                body="Provider confirmed a network outage in the region.", at=ago(hours=4, minutes=35))

    session.commit()
    print("[tickets] BD-1001 .. BD-1008 seeded (every status, priority and category represented)")


def print_summary(session) -> None:
    users = session.query(User).order_by(User.id).all()
    print("\nSeeded users (id, role, name, email):")
    for u in users:
        print(f"  {u.id:>3}  {u.role:<8}  {u.name:<16}  {u.email}")
    print("\nUse the demo identity header for any of these, e.g.:  X-User-Id: 1")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reset", action="store_true", help="truncate the 4 data tables first")
    args = parser.parse_args()

    db_name = engine.url.database
    session = SessionLocal()
    try:
        existing = session.query(User).first()
        if existing and not args.reset:
            print(f"[skip] database {db_name!r} already has users - pass --reset to wipe and reseed.")
            return 0

        if args.reset:
            reset_data(session)

        users = create_users(session)
        seed_tickets(session, users)
        print_summary(session)
        print(f"\n[ok] seeded database {db_name!r}")
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    sys.exit(main())
