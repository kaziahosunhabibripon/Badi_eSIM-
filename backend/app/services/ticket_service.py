from datetime import datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.ticket import Ticket, TicketCategory, TicketPriority, TicketStatus
from app.models.ticket_event import TicketEvent
from app.models.ticket_message import MessageType, TicketMessage
from app.models.user import User, UserRole
from app.repositories.ticket_repository import TicketRepository
from app.schemas.message import MessageResponse
from app.schemas.ticket import (
    TicketCreate,
    TicketDetailResponse,
    TicketEventResponse,
    TicketListResponse,
    TicketMessageResponse,
    TicketResponse,
    TicketUpdate,
)
from app.services.audit_service import AuditService
from app.services.message_service import MessageService

# Explicit status transition map (plan section 13). Anything not listed here is rejected
# with 409 INVALID_STATUS_TRANSITION: the UI only ever presents these choices, but this
# map is the one place that actually enforces them, so a direct API call cannot bypass it.
VALID_TRANSITIONS: Dict[TicketStatus, List[TicketStatus]] = {
    TicketStatus.OPEN: [TicketStatus.IN_PROGRESS],
    TicketStatus.IN_PROGRESS: [
        TicketStatus.WAITING_FOR_CUSTOMER,
        TicketStatus.WAITING_FOR_PROVIDER,
        TicketStatus.RESOLVED,
    ],
    TicketStatus.WAITING_FOR_CUSTOMER: [TicketStatus.IN_PROGRESS],
    TicketStatus.WAITING_FOR_PROVIDER: [TicketStatus.IN_PROGRESS],
    TicketStatus.RESOLVED: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
    TicketStatus.CLOSED: [],
}


def _ticket_fields(ticket: Ticket, *, customer: Optional[User] = None, agent: Optional[User] = None) -> dict:
    """The one place that turns a Ticket row into the API's field names.

    `customer`/`agent` let a caller pass objects it already has in hand (for example the
    customer it just created, before that row would be visible to a fresh query);
    otherwise this reads ticket.customer / ticket.assigned_agent. The repository
    eager-loads both, so reading them here never issues a query of its own.
    """
    customer = customer if customer is not None else ticket.customer
    agent = agent if agent is not None else ticket.assigned_agent
    return dict(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        customer_id=ticket.customer_id,
        customer_email=customer.email if customer else "",
        customer_name=customer.name if customer else "",
        order_id=ticket.order_id,
        category=TicketCategory(ticket.category),
        subject=ticket.subject,
        description=ticket.description,
        priority=TicketPriority(ticket.priority),
        status=TicketStatus(ticket.status),
        assigned_agent_id=ticket.assigned_agent_id,
        assigned_agent_name=agent.name if agent else None,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        resolved_at=ticket.resolved_at,
        closed_at=ticket.closed_at,
    )


def _ticket_to_response(ticket: Ticket, *, customer: Optional[User] = None, agent: Optional[User] = None) -> TicketResponse:
    return TicketResponse(**_ticket_fields(ticket, customer=customer, agent=agent))


def _ticket_to_detail_response(
    ticket: Ticket,
    *,
    messages: List["TicketMessageResponse"],
    events: List["TicketEventResponse"],
) -> TicketDetailResponse:
    return TicketDetailResponse(**_ticket_fields(ticket), messages=messages, events=events)


def _message_to_response(message: TicketMessage) -> TicketMessageResponse:
    sender = message.sender
    return TicketMessageResponse(
        id=message.id,
        ticket_id=message.ticket_id,
        sender_id=message.sender_id,
        sender_name=sender.name if sender else "Unknown",
        message_type=MessageType(message.message_type),
        body=message.body,
        created_at=message.created_at,
    )


def _event_to_response(event: TicketEvent) -> TicketEventResponse:
    actor = event.actor
    return TicketEventResponse(
        id=event.id,
        ticket_id=event.ticket_id,
        actor_id=event.actor_id,
        actor_name=actor.name if actor else "Unknown",
        event_type=event.event_type,
        old_value=event.old_value,
        new_value=event.new_value,
        metadata=event.event_metadata,
        created_at=event.created_at,
    )


class TicketService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = TicketRepository(db)
        self.audit = AuditService(db)
        self.message_service = MessageService(db)

    def find_or_create_customer(self, email: str, name: str) -> User:
        user = self.repo.get_user_by_email(email)
        if user:
            if user.role == UserRole.AGENT:
                raise ConflictError(
                    f"{email} belongs to a support agent and cannot be used as a customer email.",
                    code="CUSTOMER_EMAIL_IS_AGENT",
                    details={"email": email},
                )
            return user
        return self.repo.create_user(email=email, name=name, role=UserRole.CUSTOMER.value)

    def create_ticket(self, data: TicketCreate, creator: User) -> TicketResponse:
        email = data.customer_email.strip().lower()

        # A customer may only ever open a ticket for themselves; an agent may open one
        # for any customer ("on behalf of").
        if creator.role == UserRole.CUSTOMER and email != creator.email.lower():
            raise ForbiddenError(
                "Customers can only create tickets for their own email address.",
                code="FORBIDDEN",
            )

        customer = self.find_or_create_customer(email, email.split("@")[0])

        ticket = Ticket(
            ticket_number=self.repo.get_next_ticket_number(),
            customer_id=customer.id,
            order_id=data.order_id,
            category=data.category.value,
            subject=data.subject.strip(),
            description=data.description.strip(),
            priority=data.priority.value,
            status=TicketStatus.OPEN.value,
        )
        ticket = self.repo.create_ticket(ticket)

        # Build the response from what is already known, before commit: SQLAlchemy
        # expires instance state on commit by default, so reading attributes afterwards
        # would silently issue a fresh SELECT for each one.
        response = _ticket_to_response(ticket, customer=customer, agent=None)
        self.db.commit()
        return response

    def list_tickets(
        self,
        requester: User,
        status: Optional[TicketStatus] = None,
        priority: Optional[TicketPriority] = None,
        category: Optional[TicketCategory] = None,
        assigned_agent_id: Optional[int] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> TicketListResponse:
        # Customers only ever see their own tickets; agents see everything and can
        # additionally filter by assignee.
        customer_id = requester.id if requester.role == UserRole.CUSTOMER else None

        tickets, total = self.repo.list_tickets(
            customer_id=customer_id,
            status=status,
            priority=priority,
            category=category,
            assigned_agent_id=assigned_agent_id,
            search=search,
            page=page,
            page_size=page_size,
        )

        return TicketListResponse(
            tickets=[_ticket_to_response(t) for t in tickets],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size,
        )

    def get_ticket_detail(self, ticket_id: int, requester: User) -> TicketDetailResponse:
        ticket = self.repo.get_ticket_with_details(ticket_id)
        if not ticket:
            raise NotFoundError("Ticket not found.", code="TICKET_NOT_FOUND")
        if requester.role == UserRole.CUSTOMER and ticket.customer_id != requester.id:
            # 404, not 403: a customer must not learn that another customer's ticket
            # exists at all (plan Appendix A, decision 9).
            raise NotFoundError("Ticket not found.", code="TICKET_NOT_FOUND")

        visible_messages = self.message_service.filter_visible(ticket.messages, requester)
        message_responses = [_message_to_response(m) for m in visible_messages]

        # Audit history is agent-only (plan section 4): customers get an empty list, and
        # the loaded events are simply never turned into a response for them.
        event_responses = (
            [_event_to_response(e) for e in ticket.events] if requester.role == UserRole.AGENT else []
        )

        return _ticket_to_detail_response(ticket, messages=message_responses, events=event_responses)

    def validate_transition(self, current_status: TicketStatus, new_status: TicketStatus) -> bool:
        return new_status in VALID_TRANSITIONS.get(current_status, [])

    def update_ticket(self, ticket_id: int, data: TicketUpdate, actor: User) -> TicketResponse:
        if actor.role == UserRole.CUSTOMER:
            raise ForbiddenError("Customers cannot update tickets.", code="FORBIDDEN")

        ticket = self.repo.get_ticket_by_id(ticket_id)
        if not ticket:
            raise NotFoundError("Ticket not found.", code="TICKET_NOT_FOUND")

        # Fields the client actually sent, so an omitted field is left untouched while an
        # explicit null (unassign) is honoured. A bare `data.status` check could not tell
        # "not sent" from "sent as null" for a nullable field like assigned_agent_id.
        changed = data.model_fields_set

        if "status" in changed and data.status is not None and data.status != TicketStatus(ticket.status):
            current = TicketStatus(ticket.status)
            if not self.validate_transition(current, data.status):
                raise ConflictError(
                    f"A ticket cannot move from {current.value} to {data.status.value}.",
                    code="INVALID_STATUS_TRANSITION",
                    details={"from": current.value, "to": data.status.value},
                )
            old_status = ticket.status
            ticket.status = data.status.value
            if data.status == TicketStatus.RESOLVED:
                ticket.resolved_at = datetime.now(timezone.utc)
            elif data.status == TicketStatus.CLOSED:
                ticket.closed_at = datetime.now(timezone.utc)
            self.audit.log_status_changed(ticket.id, actor, old_status, data.status.value)

        if "priority" in changed and data.priority is not None and data.priority != TicketPriority(ticket.priority):
            old_priority = ticket.priority
            ticket.priority = data.priority.value
            self.audit.log_priority_changed(ticket.id, actor, old_priority, data.priority.value)

        agent_for_response: Optional[User] = ticket.assigned_agent
        if "assigned_agent_id" in changed and data.assigned_agent_id != ticket.assigned_agent_id:
            old_agent_id = ticket.assigned_agent_id
            new_agent: Optional[User] = None
            if data.assigned_agent_id is not None:
                new_agent = self.repo.get_user_by_id(data.assigned_agent_id)
                if not new_agent or new_agent.role != UserRole.AGENT:
                    raise NotFoundError("No such agent.", code="AGENT_NOT_FOUND")
            ticket.assigned_agent_id = data.assigned_agent_id
            agent_for_response = new_agent
            self.audit.log_assigned(ticket.id, actor, old_agent_id, ticket.assigned_agent_id)

        if changed & {"status", "priority", "assigned_agent_id"}:
            ticket.updated_at = datetime.now(timezone.utc)
        self.repo.update_ticket(ticket)

        response = _ticket_to_response(ticket, agent=agent_for_response)
        self.db.commit()
        return response

    def add_message(self, ticket_id: int, sender: User, body: str, message_type: MessageType) -> MessageResponse:
        ticket = self.repo.get_ticket_by_id(ticket_id)
        if not ticket:
            raise NotFoundError("Ticket not found.", code="TICKET_NOT_FOUND")
        if sender.role == UserRole.CUSTOMER and ticket.customer_id != sender.id:
            # Same "hide existence" reasoning as get_ticket_detail.
            raise NotFoundError("Ticket not found.", code="TICKET_NOT_FOUND")

        message = self.message_service.create_message(ticket, sender, body.strip(), message_type)
        response = MessageResponse(
            id=message.id,
            ticket_id=message.ticket_id,
            sender_id=message.sender_id,
            sender_name=sender.name,
            message_type=message_type,
            body=message.body,
            created_at=message.created_at,
        )
        self.db.commit()
        return response

    def get_ticket_for_websocket(self, ticket_id: int, requester: User) -> Optional[Ticket]:
        ticket = self.repo.get_ticket_by_id(ticket_id)
        if not ticket:
            return None
        if requester.role == UserRole.CUSTOMER and ticket.customer_id != requester.id:
            return None
        return ticket
