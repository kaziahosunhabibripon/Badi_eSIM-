"""Tests for the ticket API. Shared fixtures live in conftest.py."""

class TestMessages:
    def test_customer_add_reply(self, client, test_ticket, test_customer, as_user):
        response = client.post(
            f"/tickets/{test_ticket.id}/messages",
            json={"body": "This is my reply", "message_type": "REPLY"},
            headers=as_user(test_customer),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["body"] == "This is my reply"
        assert data["message_type"] == "REPLY"
        assert data["sender_id"] == test_customer.id

    def test_agent_add_reply(self, client, test_ticket, test_agent, as_user):
        response = client.post(
            f"/tickets/{test_ticket.id}/messages",
            json={"body": "Agent reply", "message_type": "REPLY"},
            headers=as_user(test_agent),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["body"] == "Agent reply"
        assert data["message_type"] == "REPLY"
        assert data["sender_id"] == test_agent.id

    def test_agent_add_internal_note(self, client, test_ticket, test_agent, as_user):
        response = client.post(
            f"/tickets/{test_ticket.id}/messages",
            json={"body": "Internal note for agents", "message_type": "INTERNAL_NOTE"},
            headers=as_user(test_agent),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["body"] == "Internal note for agents"
        assert data["message_type"] == "INTERNAL_NOTE"

    def test_customer_cannot_add_internal_note(self, client, test_ticket, test_customer, as_user):
        response = client.post(
            f"/tickets/{test_ticket.id}/messages",
            json={"body": "Trying to add internal note", "message_type": "INTERNAL_NOTE"},
            headers=as_user(test_customer),
        )
        assert response.status_code == 403

    def test_get_messages_filters_internal_notes_for_customer(self, client, test_ticket, test_customer, test_agent, as_user):
        agent_headers = as_user(test_agent)
        customer_headers = as_user(test_customer)

        # Agent adds an internal note and a customer-visible reply
        client.post(
            f"/tickets/{test_ticket.id}/messages",
            json={"body": "Internal note", "message_type": "INTERNAL_NOTE"},
            headers=agent_headers,
        )
        client.post(
            f"/tickets/{test_ticket.id}/messages",
            json={"body": "Agent reply", "message_type": "REPLY"},
            headers=agent_headers,
        )
        # Customer adds a reply
        client.post(
            f"/tickets/{test_ticket.id}/messages",
            json={"body": "Customer reply", "message_type": "REPLY"},
            headers=customer_headers,
        )

        # Get ticket detail as customer - should only see REPLY messages
        response = client.get(f"/tickets/{test_ticket.id}", headers=customer_headers)
        assert response.status_code == 200
        data = response.json()
        message_types = [m["message_type"] for m in data["messages"]]
        assert "INTERNAL_NOTE" not in message_types
        assert message_types.count("REPLY") == 2

    def test_get_messages_shows_internal_notes_for_agent(self, client, test_ticket, test_agent, as_user):
        agent_headers = as_user(test_agent)

        client.post(
            f"/tickets/{test_ticket.id}/messages",
            json={"body": "Internal note", "message_type": "INTERNAL_NOTE"},
            headers=agent_headers,
        )
        client.post(
            f"/tickets/{test_ticket.id}/messages",
            json={"body": "Agent reply", "message_type": "REPLY"},
            headers=agent_headers,
        )

        response = client.get(f"/tickets/{test_ticket.id}", headers=agent_headers)
        assert response.status_code == 200
        data = response.json()
        message_types = [m["message_type"] for m in data["messages"]]
        assert "INTERNAL_NOTE" in message_types
        assert message_types.count("REPLY") == 1
        assert message_types.count("INTERNAL_NOTE") == 1


class TestMessageValidation:
    def test_empty_message_rejected(self, client, test_ticket, test_customer, as_user):
        response = client.post(
            f"/tickets/{test_ticket.id}/messages",
            json={"body": "", "message_type": "REPLY"},
            headers=as_user(test_customer),
        )
        assert response.status_code == 422