from fastapi import Depends, Header
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.exceptions import UnauthorizedError
from app.models.user import User


def get_current_user(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the caller from the demo identity header (plan section 39).

    Authentication is out of scope for this assignment; this is the seeded-user stand-in
    it calls for, and it is fail-closed: there is no fallback to "the first user" and no
    implicit account creation. Plain `def`, not `async def`: the query below is blocking
    SQLAlchemy, and an `async def` dependency that blocks would stall the event loop for
    every other in-flight request. FastAPI runs sync dependencies in a thread pool.
    """
    if not x_user_id:
        raise UnauthorizedError("The X-User-Id header is required.", code="NOT_AUTHENTICATED")
    try:
        user_id = int(x_user_id)
    except ValueError:
        raise UnauthorizedError("X-User-Id must be a number.", code="INVALID_USER_ID")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise UnauthorizedError("Unknown user id in X-User-Id.", code="UNKNOWN_USER")
    return user
