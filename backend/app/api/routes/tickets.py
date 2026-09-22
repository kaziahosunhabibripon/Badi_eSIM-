from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.services.ticket_service import TicketService
from app.api.deps import get_current_user
from app.schemas.ticket import (
    TicketCreate,
    TicketUpdate,
    TicketListResponse,
    TicketDetailResponse,
    TicketResponse,
)
from app.models.user import User
from app.models.ticket import TicketStatus, TicketPriority, TicketCategory

router = APIRouter(prefix="/tickets", tags=["tickets"])

# Routes stay thin (plan section 16): validate via the schema, call one service method,
# return its result. Business rules, ownership checks and error mapping all live in
# TicketService and the exception handlers registered in app.main - never here.


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TicketResponse:
    """Create a ticket. Serves both roles (plan section 9): a customer may only use their
    own e-mail, an agent may create on behalf of any customer - TicketService decides."""
    return TicketService(db).create_ticket(data, current_user)


@router.get("", response_model=TicketListResponse)
def list_tickets(
    status: Optional[TicketStatus] = Query(None),
    priority: Optional[TicketPriority] = Query(None),
    category: Optional[TicketCategory] = Query(None),
    assigned_agent_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TicketListResponse:
    return TicketService(db).list_tickets(
        requester=current_user,
        status=status,
        priority=priority,
        category=category,
        assigned_agent_id=assigned_agent_id,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get("/{ticket_id}", response_model=TicketDetailResponse)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TicketDetailResponse:
    return TicketService(db).get_ticket_detail(ticket_id, current_user)


@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: int,
    data: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TicketResponse:
    return TicketService(db).update_ticket(ticket_id, data, current_user)
