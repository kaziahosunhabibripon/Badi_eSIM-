from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from app.models.ticket import TicketStatus, TicketPriority, TicketCategory
from app.models.ticket_message import MessageType


class TicketCreate(BaseModel):
    """Fields the assignment requires on creation (customer or agent may submit this).

    `priority` has no default: the assignment lists it as a required field, so a request
    that omits it is rejected with 422 rather than silently defaulting to MEDIUM.
    """

    customer_email: EmailStr
    category: TicketCategory
    subject: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    priority: TicketPriority
    order_id: Optional[str] = None


class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_agent_id: Optional[int] = None


class TicketMessageResponse(BaseModel):
    id: int
    ticket_id: int
    sender_id: int
    sender_name: str
    message_type: MessageType
    body: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TicketEventResponse(BaseModel):
    id: int
    ticket_id: int
    actor_id: int
    actor_name: str
    event_type: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TicketResponse(BaseModel):
    id: int
    ticket_number: str
    customer_id: int
    customer_email: str
    customer_name: str
    order_id: Optional[str] = None
    category: TicketCategory
    subject: str
    description: str
    priority: TicketPriority
    status: TicketStatus
    assigned_agent_id: Optional[int] = None
    assigned_agent_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TicketDetailResponse(TicketResponse):
    messages: List[TicketMessageResponse] = []
    events: List[TicketEventResponse] = []


class TicketListResponse(BaseModel):
    tickets: List[TicketResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
