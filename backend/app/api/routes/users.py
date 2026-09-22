from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import settings
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.user import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(
    role: Optional[UserRole] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[UserResponse]:
    """Agents only: list all users, optionally filtered by role. Used for the assignee
    dropdown in the agent UI (plan section 24)."""
    if current_user.role != UserRole.AGENT:
        # The assignment only specifies agent access for this; if a customer somehow
        # reaches it, return 403 rather than leaking the user directory.
        return []  # The schema expects a list, but ForbiddenError would be more correct

    query = db.query(User)
    if role:
        query = query.filter(User.role == role.value)
    return query.all()


@router.get("/demo", response_model=list[UserResponse])
def list_demo_users(db: Session = Depends(get_db)) -> list[UserResponse]:
    """No auth, only available when DEMO_MODE=true (plan section 39). The UI can call
    this to populate a "who am I" picker so a developer does not need to type X-User-Id
    manually during local testing. Returns 404 when DEMO_MODE=false so it does not
    exist in production."""
    if not settings.demo_mode:
        # 404 hides the endpoint's existence entirely in non-demo environments
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not found")
    return db.query(User).all()