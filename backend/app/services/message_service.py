from sqlalchemy.orm import Session
from typing import List
from app.core.exceptions import ForbiddenError
from app.models.ticket_message import TicketMessage, MessageType
from app.models.ticket import Ticket
from app.models.user import User, UserRole
from app.repositories.ticket_repository import TicketRepository


class MessageService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = TicketRepository(db)

    def create_message(
        self,
        ticket: Ticket,
        sender: User,
        body: str,
        message_type: MessageType,
    ) -> TicketMessage:
        # Only agents can create internal notes (allow-list): this is the one place that
        # decides it, so no other layer needs to repeat the check.
        if message_type == MessageType.INTERNAL_NOTE and sender.role != UserRole.AGENT:
            raise ForbiddenError("Only agents can create internal notes.", code="FORBIDDEN")

        message = TicketMessage(
            ticket_id=ticket.id,
            sender_id=sender.id,
            message_type=message_type.value,
            body=body,
        )
        # Set the relationship directly: sender is already the loaded User the caller
        # authenticated as, so this avoids a query when the response is built from it.
        message.sender = sender
        return self.repo.add_message(message)

    def filter_visible(self, messages: List[TicketMessage], requester: User) -> List[TicketMessage]:
        """Allow-list: only AGENT sees INTERNAL_NOTE (plan section 10).

        Takes an already-loaded list rather than querying itself, so a caller that has
        eager-loaded a ticket's messages (plan section 33: no N+1) does not pay for a
        second query just to apply this rule.
        """
        if requester.role == UserRole.AGENT:
            return list(messages)
        return [m for m in messages if m.message_type == MessageType.REPLY.value]
