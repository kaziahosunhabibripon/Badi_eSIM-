import enum
from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class MessageType(str, enum.Enum):
    REPLY = "REPLY"
    INTERNAL_NOTE = "INTERNAL_NOTE"


class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ticket_id = Column(BigInteger, ForeignKey("tickets.id"), nullable=False, index=True)
    sender_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    message_type = Column(String(20), nullable=False, default=MessageType.REPLY.value)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ticket = relationship("Ticket", back_populates="messages")
    sender = relationship("User", backref="sent_messages")

    def __repr__(self):
        return f"<TicketMessage(id={self.id}, ticket_id={self.ticket_id}, type={self.message_type})>"