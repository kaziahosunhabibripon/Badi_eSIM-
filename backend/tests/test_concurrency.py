"""Concurrent ticket creation must never produce a duplicate ticket number (plan section
8). This only actually proves anything on real PostgreSQL: nextval() on a sequence is
guaranteed atomic and is never rolled back, even if the surrounding transaction is -
that is the whole reason the plan requires a database sequence instead of, say,
counting existing rows.
"""
from concurrent.futures import ThreadPoolExecutor

from app.core.database import SessionLocal
from app.repositories.ticket_repository import TicketRepository

WORKERS = 20


def test_20_concurrent_ticket_numbers_are_all_distinct(db):
    def get_one_number() -> str:
        # Each worker gets its own session/connection, exactly like 20 simultaneous
        # requests would (NullPool: one real connection per session).
        session = SessionLocal()
        try:
            number = TicketRepository(session).get_next_ticket_number()
            session.commit()
            return number
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        numbers = list(pool.map(lambda _: get_one_number(), range(WORKERS)))

    assert len(numbers) == WORKERS
    assert len(set(numbers)) == WORKERS, f"duplicate ticket numbers were generated: {numbers}"
    assert all(n.startswith("BD-") for n in numbers)
