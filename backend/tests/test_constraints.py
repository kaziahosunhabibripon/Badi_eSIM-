"""Constraints the Alembic migration puts on the database itself, checked directly
against PostgreSQL rather than through service-layer validation - these must hold even
if a bug ever let bad data reach the session (plan section 53)."""
import pytest
from sqlalchemy.exc import IntegrityError

from app.models.ticket import Ticket, TicketCategory, TicketPriority, TicketStatus
from app.models.ticket_message import TicketMessage
from app.models.user import User, UserRole


def test_ticket_message_rejects_an_unknown_ticket_id(db, test_customer):
    db.add(TicketMessage(ticket_id=999999, sender_id=test_customer.id, message_type="REPLY", body="orphan"))
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


def test_users_email_must_be_unique(db):
    db.add(User(email="dup@test.com", name="First", role=UserRole.CUSTOMER.value))
    db.flush()
    db.add(User(email="dup@test.com", name="Second", role=UserRole.CUSTOMER.value))
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


def test_ticket_number_must_be_unique(db, test_customer):
    def make(number):
        return Ticket(
            ticket_number=number,
            customer_id=test_customer.id,
            category=TicketCategory.OTHER.value,
            subject="s",
            description="d",
            priority=TicketPriority.LOW.value,
            status=TicketStatus.OPEN.value,
        )

    db.add(make("BD-9001"))
    db.flush()
    db.add(make("BD-9001"))
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()
