from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from app.models.ticket_message import MessageType


class MessageCreate(BaseModel):
    """POST /tickets/{id}/messages body.

    `message_type` defaults to REPLY, the only option a customer may use. An agent may
    also send INTERNAL_NOTE here; the one place that checks who is allowed to is
    MessageService.create_message, not a separate endpoint or schema.
    """

    body: str = Field(..., min_length=1)
    message_type: MessageType = MessageType.REPLY


class MessageResponse(BaseModel):
    id: int
    ticket_id: int
    sender_id: int
    sender_name: str
    message_type: MessageType
    body: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
