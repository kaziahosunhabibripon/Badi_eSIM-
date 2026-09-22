from typing import Dict, Set, TYPE_CHECKING
from fastapi import WebSocket
import json

if TYPE_CHECKING:
    from app.schemas.message import MessageResponse


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, ticket_id: int, websocket: WebSocket):
        await websocket.accept()
        if ticket_id not in self.active_connections:
            self.active_connections[ticket_id] = set()
        self.active_connections[ticket_id].add(websocket)

    def disconnect(self, ticket_id: int, websocket: WebSocket):
        if ticket_id in self.active_connections:
            self.active_connections[ticket_id].discard(websocket)
            if not self.active_connections[ticket_id]:
                del self.active_connections[ticket_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast_to_ticket(self, ticket_id: int, message: dict):
        if ticket_id in self.active_connections:
            # default=str is a safety net: the payload is expected to already be plain
            # JSON (see broadcast_new_message below), but this keeps a stray non-JSON
            # value (e.g. a datetime) from turning a successfully saved message into a
            # broadcast failure.
            message_str = json.dumps(message, default=str)
            disconnected = set()
            for connection in self.active_connections[ticket_id]:
                try:
                    await connection.send_text(message_str)
                except Exception:
                    disconnected.add(connection)
            for conn in disconnected:
                self.disconnect(ticket_id, conn)


manager = ConnectionManager()


async def broadcast_new_message(ticket_id: int, message: "MessageResponse") -> None:
    """Push a newly created customer-visible reply to everyone viewing this ticket.

    Scheduled as a BackgroundTasks call from the messages route, so it only runs after
    the HTTP response for the POST has been built (the message is already committed by
    then - see TicketService.add_message). `model_dump(mode="json")` turns the message's
    datetime into an ISO 8601 string, so the event is plain JSON before it ever reaches
    broadcast_to_ticket. Only ever called for REPLY messages: an INTERNAL_NOTE must never
    be broadcast (plan section 27), and the caller enforces that, not this function.
    """
    await manager.broadcast_to_ticket(
        ticket_id,
        {
            "event": "message.created",
            "ticket_id": ticket_id,
            "message": message.model_dump(mode="json"),
        },
    )
