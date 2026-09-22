from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey, func, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class TicketEvent(Base):
    __tablename__ = "ticket_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ticket_id = Column(BigInteger, ForeignKey("tickets.id"), nullable=False, index=True)
    actor_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    event_type = Column(String(30), nullable=False)
    old_value = Column(String(255), nullable=True)
    new_value = Column(String(255), nullable=True)
    event_metadata = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ticket = relationship("Ticket", back_populates="events")
    actor = relationship("User", backref="audit_events")

    def __repr__(self):
        return f"<TicketEvent(id={self.id}, ticket_id={self.ticket_id}, type={self.event_type})>"