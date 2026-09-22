from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.database_url,
    poolclass=NullPool,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db():
    """Session per request. Does NOT commit - services own the transaction boundary.
    
    Rollback on exception, always close. The explicit commit happens in the service
    layer (TicketService.create_ticket, update_ticket, add_message) so that:
    - The commit happens BEFORE the response is sent
    - If commit fails, the client sees a proper error (503/500), not 201 with lost data
    - WebSocket broadcasts scheduled via BackgroundTasks run AFTER commit
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()