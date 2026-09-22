from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.services.ticket_service import TicketService
from app.websocket.manager import manager

router = APIRouter(prefix="/tickets", tags=["websocket"])


@router.websocket("/{ticket_id}/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    ticket_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """Realtime channel for one ticket's conversation (plan section 27).

    Authentication is the same demo mechanism as the HTTP API (plan section 39), but a
    browser cannot set a custom header on a WebSocket handshake, so the caller identifies
    themselves with ?user_id= instead of X-User-Id. Fail-closed: there is no fallback to
    "the first user" and no account is ever created here - an unknown user, or a ticket
    the user may not access, closes the socket immediately with 1008 (policy violation).

    `db` is injected the same way every HTTP route gets it (so tests can override it),
    but is closed explicitly right after the access check instead of at the end of the
    function: the receive loop below can run for as long as the browser stays connected,
    and a connection should not sit open (NullPool means one real database connection
    per session) for that whole time. The dependency's own teardown still runs when the
    function returns; closing an already-closed session again there is a harmless no-op.
    """
    user = db.query(User).filter(User.id == user_id).first()
    ticket = TicketService(db).get_ticket_for_websocket(ticket_id, user) if user else None
    db.close()

    if user is None or ticket is None:
        await websocket.close(code=1008)
        return

    await manager.connect(ticket_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ticket_id, websocket)
