"""Realtime broadcast wired through BackgroundTasks (plan section 27): a customer-visible
reply is pushed to the ticket's WebSocket room, an internal note never is.

Two levels: a fast unit test of the connection manager itself (no event loop timing to
get wrong), and a route-level test proving the messages endpoint only ever schedules a
broadcast for REPLY, by monkeypatching the broadcast call and checking what it received.
"""
import asyncio
from datetime import datetime, timezone

from app.schemas.message import MessageResponse
from app.websocket.manager import ConnectionManager, broadcast_new_message, manager


class _FakeSocket:
    def __init__(self):
        self.sent: list[str] = []

    async def send_text(self, text: str) -> None:
        self.sent.append(text)


def test_broadcast_sends_json_safe_payload_to_every_connection_on_the_ticket():
    # broadcast_new_message always pushes through the module-level `manager` singleton
    # (that is what the messages route calls too), so the fake connections have to be
    # registered on that same instance, not a fresh ConnectionManager(). Save and restore
    # its state: it is process-wide and would otherwise leak into other tests.
    saved = manager.active_connections
    manager.active_connections = {}
    try:
        a, b = _FakeSocket(), _FakeSocket()
        manager.active_connections[1] = {a, b}

        message = MessageResponse(
            id=1,
            ticket_id=1,
            sender_id=1,
            sender_name="Agent",
            message_type="REPLY",
            body="hi",
            created_at=datetime.now(timezone.utc),
        )

        asyncio.run(broadcast_new_message(1, message))

        assert len(a.sent) == 1
        assert a.sent == b.sent
        assert "message.created" in a.sent[0]
        assert "hi" in a.sent[0]
    finally:
        manager.active_connections = saved


def test_broadcast_to_a_ticket_with_no_connections_does_not_raise():
    manager = ConnectionManager()
    asyncio.run(manager.broadcast_to_ticket(999, {"event": "message.created"}))


class TestRealtimeWiring:
    def test_reply_schedules_a_broadcast(self, client, test_ticket, test_agent, as_user, monkeypatch):
        calls = []

        async def fake_broadcast(ticket_id, message):
            calls.append((ticket_id, message))

        monkeypatch.setattr("app.api.routes.messages.broadcast_new_message", fake_broadcast)

        response = client.post(
            f"/tickets/{test_ticket.id}/messages",
            json={"body": "Agent reply", "message_type": "REPLY"},
            headers=as_user(test_agent),
        )
        assert response.status_code == 201
        assert len(calls) == 1
        ticket_id, message = calls[0]
        assert ticket_id == test_ticket.id
        assert message.message_type == "REPLY"
        assert message.body == "Agent reply"

    def test_internal_note_does_not_schedule_a_broadcast(self, client, test_ticket, test_agent, as_user, monkeypatch):
        calls = []
        monkeypatch.setattr(
            "app.api.routes.messages.broadcast_new_message",
            lambda ticket_id, message: calls.append((ticket_id, message)),
        )

        response = client.post(
            f"/tickets/{test_ticket.id}/messages",
            json={"body": "Internal note", "message_type": "INTERNAL_NOTE"},
            headers=as_user(test_agent),
        )
        assert response.status_code == 201
        assert calls == []


class TestRealtimeEndToEnd:
    """The assignment's own core requirement: a customer-visible reply appears live on
    the other party's screen without a page refresh, in both directions, and an internal
    note never appears on the customer's screen at all - proved with two real, concurrently
    open TestClient WebSocket connections rather than a mock.
    """

    def test_reply_reaches_the_other_party_live_and_notes_reach_no_one(
        self, client, test_ticket, test_agent, test_customer, as_user
    ):
        with client.websocket_connect(f"/tickets/{test_ticket.id}/ws?user_id={test_agent.id}") as agent_ws, \
                client.websocket_connect(f"/tickets/{test_ticket.id}/ws?user_id={test_customer.id}") as customer_ws:

            # A REPLY broadcasts to the whole ticket room, sender included (both of this
            # test's connections are viewing the same ticket).
            def post_reply(body: str, *, as_who) -> None:
                response = client.post(
                    f"/tickets/{test_ticket.id}/messages",
                    json={"body": body, "message_type": "REPLY"},
                    headers=as_user(as_who),
                )
                assert response.status_code == 201
                for ws in (agent_ws, customer_ws):
                    event = ws.receive_json()
                    assert event["event"] == "message.created"
                    assert event["message"]["body"] == body
                    assert event["message"]["message_type"] == "REPLY"

            # Agent replies -> both connections see it live, including the customer's.
            post_reply("Are you in Turkey?", as_who=test_agent)

            # Customer replies -> both connections see it live, including the agent's.
            post_reply("Yes", as_who=test_customer)

            # An internal note is never broadcast to anyone. Proved without a fragile
            # "wait and assert nothing arrived": the next customer-visible reply is sent
            # right after it, and if the note HAD been queued ahead of it, this would be
            # the note's body instead.
            response = client.post(
                f"/tickets/{test_ticket.id}/messages",
                json={"body": "Escalated to provider", "message_type": "INTERNAL_NOTE"},
                headers=as_user(test_agent),
            )
            assert response.status_code == 201
            post_reply("Confirmed with provider", as_who=test_agent)
