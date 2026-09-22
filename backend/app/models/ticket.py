import enum
from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey, func, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    WAITING_FOR_CUSTOMER = "WAITING_FOR_CUSTOMER"
    WAITING_FOR_PROVIDER = "WAITING_FOR_PROVIDER"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class TicketPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class TicketCategory(str, enum.Enum):
    INSTALLATION = "INSTALLATION"
    ACTIVATION = "ACTIVATION"
    CONNECTIVITY = "CONNECTIVITY"
    ORDER = "ORDER"
    TOPUP = "TOPUP"
    REFUND = "REFUND"
    OTHER = "OTHER"


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ticket_number = Column(String(20), unique=True, nullable=False, index=True)
    customer_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    order_id = Column(String(50), nullable=True, index=True)
    category = Column(String(30), nullable=False)
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(20), nullable=False, default=TicketPriority.MEDIUM.value)
    status = Column(String(30), nullable=False, default=TicketStatus.OPEN.value)
    assigned_agent_id = Column(BigInteger, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    customer = relationship("User", foreign_keys=[customer_id], backref="tickets_as_customer")
    assigned_agent = relationship("User", foreign_keys=[assigned_agent_id], backref="tickets_as_agent")
    # Ordered here, once, so the conversation and the audit trail read oldest-first
    # everywhere they are loaded (detail view, eager-loaded or not). Several events or
    # messages written in the same PATCH can share one created_at (PostgreSQL now() is
    # the transaction start), so id is the tiebreaker.
    messages = relationship(
        "TicketMessage",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="TicketMessage.created_at, TicketMessage.id",
    )
    events = relationship(
        "TicketEvent",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="TicketEvent.created_at, TicketEvent.id",
    )

    __table_args__ = (
        Index("ix_tickets_status_priority", "status", "priority"),
        Index("ix_tickets_customer_status", "customer_id", "status"),
    )

    def __repr__(self):
        return f"<Ticket(id={self.id}, number={self.ticket_number}, status={self.status})>"