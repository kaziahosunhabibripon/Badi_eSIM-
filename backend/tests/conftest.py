"""Shared pytest fixtures for the ticket API tests.

Tests run against a REAL PostgreSQL database, never SQLite: the ticket-number sequence
(plan section 8), timestamptz columns, and the foreign-key/unique/check constraints the
Alembic migration creates only behave exactly as they do in production on PostgreSQL
itself.

DATABASE_URL must already point at that test database before pytest starts (see
README.md - normally badi_support_test), and this file refuses to even collect a test
otherwise: nothing here silently redirects to a derived "_test" database, because that
could just as easily hide a real misconfiguration as prevent one. Because DATABASE_URL
is set before app.core.database is ever imported, the application's own engine and
session factory already point at the test database - no get_db override is needed, and
every route is exercised exactly as it runs in production.
"""
import os
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.main import app
from app.models.ticket import Ticket, TicketCategory, TicketPriority, TicketStatus
from app.models.user import User, UserRole
from app.repositories.ticket_repository import TicketRepository

REPO_ROOT = Path(__file__).resolve().parents[2]
_DB_NAME = settings.database_url.rsplit("/", 1)[-1]

if not _DB_NAME.endswith("_test"):
    raise RuntimeError(
        f"Refusing to run tests against database {_DB_NAME!r}. DATABASE_URL must point "
        "at a database whose name ends in _test (see README.md - normally "
        "badi_support_test) before pytest starts. Tests truncate their tables between "
        "runs and must never be pointed at badi_support."
    )

_DATA_TABLES = ("ticket_events", "ticket_messages", "tickets", "users")


@pytest.fixture(scope="session", autouse=True)
def _schema():
    """Build the schema with the real Alembic migration, once per test session.

    This is also what proves the migration itself actually works (plan section 34:
    never rely on create_all() as the migration mechanism) - if it is broken, every test
    fails at collection time instead of pytest quietly falling back to something else.
    """
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "alembic.ini", "upgrade", "head"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        env={**os.environ, "DATABASE_URL": settings.database_url},
    )
    if result.returncode != 0:
        raise RuntimeError(
            "alembic upgrade head failed for the test database:\n"
            f"{result.stdout}\n{result.stderr}"
        )
    yield


@pytest.fixture(scope="function")
def db(_schema):
    """A clean slate before every test - every data table is truncated (the schema
    itself comes from the migration, once per session, not create_all()) and the
    ticket-number sequence is restarted so BD-1001 is deterministic wherever a test
    needs one.

    Yields a session the test can use to set up fixtures and read back state. Route
    handlers use their own separate sessions, exactly as they do outside of tests: this
    is a real database, so a commit in one session is visible to another, the same as
    it would be between two real requests.
    """
    with engine.connect() as conn:
        conn.execute(text(f"truncate table {', '.join(_DATA_TABLES)} restart identity cascade"))
        conn.execute(text("alter sequence ticket_number_seq restart with 1"))
        conn.commit()
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    # Intentionally not a context manager: the app's own startup database check (plan
    # section 20, app.main.lifespan) is meant to run once when a server process actually
    # starts, not on every test - _schema above already proves the database is reachable
    # and migrated.
    return TestClient(app)


@pytest.fixture
def as_user():
    """Build the demo-identity header (plan section 39) for a specific seeded user."""

    def _headers(user):
        return {"X-User-Id": str(user.id)}

    return _headers


@pytest.fixture
def test_agent(db):
    agent = User(email="agent@test.com", name="Test Agent", role=UserRole.AGENT.value)
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@pytest.fixture
def test_customer(db):
    customer = User(email="customer@test.com", name="Test Customer", role=UserRole.CUSTOMER.value)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@pytest.fixture
def test_ticket(db, test_customer):
    # Goes through the real sequence (not a hardcoded "BD-1001") so this fixture can
    # never collide with a ticket number a test creates afterwards through the API; the
    # sequence restart above means it still deterministically comes out as BD-1001.
    ticket = Ticket(
        ticket_number=TicketRepository(db).get_next_ticket_number(),
        customer_id=test_customer.id,
        category=TicketCategory.CONNECTIVITY.value,
        subject="Test ticket",
        description="Test description",
        priority=TicketPriority.MEDIUM.value,
        status=TicketStatus.OPEN.value,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket
