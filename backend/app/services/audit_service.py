from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from app.models.ticket_event import TicketEvent
from app.models.user import User
from app.services.event_type import EventType


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def log_event(
        self,
        ticket_id: int,
        actor: User,
        event_type: EventType,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TicketEvent:
        event = TicketEvent(
            ticket_id=ticket_id,
            actor_id=actor.id,
            event_type=event_type.value,
            old_value=old_value,
            new_value=new_value,
            event_metadata=metadata,
        )
        self.db.add(event)
        self.db.flush()
        return event

    def log_status_changed(
        self,
        ticket_id: int,
        actor: User,
        old_status: str,
        new_status: str,
    ) -> TicketEvent:
        return self.log_event(
            ticket_id=ticket_id,
            actor=actor,
            event_type=EventType.STATUS_CHANGED,
            old_value=old_status,
            new_value=new_status,
        )

    def log_assigned(
        self,
        ticket_id: int,
        actor: User,
        old_agent_id: Optional[int],
        new_agent_id: Optional[int],
    ) -> TicketEvent:
        old_agent = self.db.query(User).filter(User.id == old_agent_id).first() if old_agent_id else None
        new_agent = self.db.query(User).filter(User.id == new_agent_id).first() if new_agent_id else None
        return self.log_event(
            ticket_id=ticket_id,
            actor=actor,
            event_type=EventType.ASSIGNED,
            old_value=old_agent.name if old_agent else None,
            new_value=new_agent.name if new_agent else None,
        )

    def log_priority_changed(
        self,
        ticket_id: int,
        actor: User,
        old_priority: str,
        new_priority: str,
    ) -> TicketEvent:
        return self.log_event(
            ticket_id=ticket_id,
            actor=actor,
            event_type=EventType.PRIORITY_CHANGED,
            old_value=old_priority,
            new_value=new_priority,
        )