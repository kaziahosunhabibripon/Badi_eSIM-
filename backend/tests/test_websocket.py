"""WebSocket authentication and access checks (plan sections 27, 39): fail-closed, no
fallback identity, no existence leak to a user who is not part of the ticket."""
import pytest
from starlette.websockets import WebSocketDisconnect

from app.models.user import User, UserRole


class TestWebSocketAccess:
    def test_unknown_user_is_refused(self, client, test_ticket):
        with pytest.raises(WebSocketDisconnect) as exc_info:
            with client.websocket_connect(f"/tickets/{test_ticket.id}/ws?user_id=999999"):
                pass
        assert exc_info.value.code == 1008

    def test_customer_cannot_open_another_customers_ticket(self, client, test_ticket, db):
        other = User(email="other@test.com", name="Other Customer", role=UserRole.CUSTOMER.value)
        db.add(other)
        db.commit()
        db.refresh(other)

        with pytest.raises(WebSocketDisconnect) as exc_info:
            with client.websocket_connect(f"/tickets/{test_ticket.id}/ws?user_id={other.id}"):
                pass
        assert exc_info.value.code == 1008

    def test_agent_can_connect_to_any_ticket(self, client, test_ticket, test_agent):
        # Connecting and cleanly closing is enough to prove access was allowed.
        with client.websocket_connect(f"/tickets/{test_ticket.id}/ws?user_id={test_agent.id}"):
            pass

    def test_customer_can_connect_to_their_own_ticket(self, client, test_ticket, test_customer):
        with client.websocket_connect(f"/tickets/{test_ticket.id}/ws?user_id={test_customer.id}"):
            pass
