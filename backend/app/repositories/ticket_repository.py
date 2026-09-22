from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func, or_
from typing import Optional, List, Tuple
from app.models.ticket import Ticket, TicketStatus, TicketPriority, TicketCategory
from app.models.ticket_message import TicketMessage
from app.models.ticket_event import TicketEvent
from app.models.user import User


class TicketRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def create_user(self, email: str, name: str, role: str = "CUSTOMER") -> User:
        user = User(email=email, name=name, role=role)
        self.db.add(user)
        self.db.flush()
        return user

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_next_ticket_number(self) -> str:
        """Build the human-readable ticket number, for example BD-1001.

        nextval() on ticket_number_seq (plan section 8) is what makes this
        concurrency-safe: two concurrent callers can never receive the same value, and,
        unlike a transaction's other writes, a sequence advance is never rolled back.
        """
        seq_num = self.db.execute(func.nextval("ticket_number_seq")).scalar()
        return f"BD-{seq_num + 1000}"

    def create_ticket(self, ticket: Ticket) -> Ticket:
        self.db.add(ticket)
        self.db.flush()
        return ticket

    def get_ticket_by_id(self, ticket_id: int) -> Optional[Ticket]:
        """For paths that need the ticket plus who it belongs to / is assigned to, but
        not its full conversation and audit history (mutation paths, the websocket
        access check). customer/assigned_agent are cheap to eager-load unconditionally:
        it is two extra queries per call, never one per row.
        """
        return (
            self.db.query(Ticket)
            .options(selectinload(Ticket.customer), selectinload(Ticket.assigned_agent))
            .filter(Ticket.id == ticket_id)
            .first()
        )

    def get_ticket_with_details(self, ticket_id: int) -> Optional[Ticket]:
        """Everything the ticket detail view needs, in a fixed number of queries no
        matter how many messages or events the ticket has (plan section 33: no N+1)."""
        return (
            self.db.query(Ticket)
            .options(
                selectinload(Ticket.customer),
                selectinload(Ticket.assigned_agent),
                selectinload(Ticket.messages).selectinload(TicketMessage.sender),
                selectinload(Ticket.events).selectinload(TicketEvent.actor),
            )
            .filter(Ticket.id == ticket_id)
            .first()
        )

    def list_tickets(
        self,
        customer_id: Optional[int] = None,
        status: Optional[TicketStatus] = None,
        priority: Optional[TicketPriority] = None,
        category: Optional[TicketCategory] = None,
        assigned_agent_id: Optional[int] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Ticket], int]:
        query = self.db.query(Ticket).options(
            selectinload(Ticket.customer), selectinload(Ticket.assigned_agent)
        )

        if customer_id:
            query = query.filter(Ticket.customer_id == customer_id)
        if status:
            query = query.filter(Ticket.status == status.value)
        if priority:
            query = query.filter(Ticket.priority == priority.value)
        if category:
            query = query.filter(Ticket.category == category.value)
        if assigned_agent_id:
            query = query.filter(Ticket.assigned_agent_id == assigned_agent_id)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Ticket.subject.ilike(search_term),
                    Ticket.description.ilike(search_term),
                    Ticket.ticket_number.ilike(search_term),
                )
            )

        total = query.count()
        query = query.order_by(Ticket.updated_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        return query.all(), total

    def update_ticket(self, ticket: Ticket) -> Ticket:
        self.db.add(ticket)
        self.db.flush()
        return ticket

    def add_message(self, message: TicketMessage) -> TicketMessage:
        self.db.add(message)
        self.db.flush()
        return message
