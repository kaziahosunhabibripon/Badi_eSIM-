from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.ticket_service import TicketService
from app.api.deps import get_current_user
from app.schemas.message import MessageCreate, MessageResponse
from app.models.user import User
from app.models.ticket_message import MessageType
from app.websocket.manager import broadcast_new_message

router = APIRouter(prefix="/tickets", tags=["messages"])


@router.post("/{ticket_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def add_message(
    ticket_id: int,
    data: MessageCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """Add a reply or an internal note; the message_type in the body picks which, and
    MessageService is the one place that checks who may use INTERNAL_NOTE.

    Customer-visible replies broadcast to the ticket's WebSocket room after the response
    is built (plan section 27); an internal note is never broadcast, since the manager
    has no notion of who is allowed to see what - only REPLY messages ever reach it.
    """
    message = TicketService(db).add_message(
        ticket_id=ticket_id,
        sender=current_user,
        body=data.body,
        message_type=data.message_type,
    )
    if message.message_type == MessageType.REPLY:
        background_tasks.add_task(broadcast_new_message, ticket_id, message)
    return message
