"""Tests for the ticket API. Shared fixtures live in conftest.py."""
from app.models.user import User, UserRole


class TestTicketCreation:
    def test_create_ticket_by_customer(self, client, test_customer, as_user):
        response = client.post(
            "/tickets",
            json={
                "customer_email": "customer@test.com",
                "category": "CONNECTIVITY",
                "subject": "My eSIM not working",
                "description": "No data connection",
                "priority": "HIGH",
            },
            headers=as_user(test_customer),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["ticket_number"].startswith("BD-")
        assert data["subject"] == "My eSIM not working"
        assert data["status"] == "OPEN"

    def test_create_ticket_by_agent(self, client, test_agent, as_user):
        response = client.post(
            "/tickets",
            json={
                "customer_email": "newcustomer@test.com",
                "category": "ACTIVATION",
                "subject": "Cannot activate",
                "description": "Activation failed",
                "priority": "MEDIUM",
            },
            headers=as_user(test_agent),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["ticket_number"].startswith("BD-")

    def test_create_ticket_invalid_category(self, client, test_customer, as_user):
        response = client.post(
            "/tickets",
            json={
                "customer_email": "test@test.com",
                "category": "INVALID",
                "subject": "Test",
                "description": "Test",
                "priority": "MEDIUM",
            },
            headers=as_user(test_customer),
        )
        assert response.status_code == 422

    def test_create_ticket_missing_fields(self, client, test_customer, as_user):
        response = client.post(
            "/tickets",
            json={
                "customer_email": "test@test.com",
            },
            headers=as_user(test_customer),
        )
        assert response.status_code == 422

    def test_create_ticket_missing_priority_is_rejected(self, client, test_customer, as_user):
        # The assignment lists priority as required on creation: omitting it must not
        # silently fall back to a default.
        response = client.post(
            "/tickets",
            json={
                "customer_email": "customer@test.com",
                "category": "CONNECTIVITY",
                "subject": "No signal",
                "description": "No data connection",
            },
            headers=as_user(test_customer),
        )
        assert response.status_code == 422

    def test_customer_cannot_create_ticket_for_another_email(self, client, test_customer, as_user):
        response = client.post(
            "/tickets",
            json={
                "customer_email": "someone.else@test.com",
                "category": "CONNECTIVITY",
                "subject": "Not mine",
                "description": "Trying to open a ticket as someone else",
                "priority": "LOW",
            },
            headers=as_user(test_customer),
        )
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "FORBIDDEN"

    def test_agent_email_cannot_be_used_as_a_customer_email(self, client, test_agent, as_user):
        response = client.post(
            "/tickets",
            json={
                "customer_email": test_agent.email,
                "category": "CONNECTIVITY",
                "subject": "Wrong email",
                "description": "An agent's email used as the customer",
                "priority": "LOW",
            },
            headers=as_user(test_agent),
        )
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "CUSTOMER_EMAIL_IS_AGENT"


class TestTicketListing:
    def test_list_tickets_empty(self, client, test_customer, as_user):
        response = client.get("/tickets", headers=as_user(test_customer))
        assert response.status_code == 200
        data = response.json()
        assert data["tickets"] == []
        assert data["total"] == 0

    def test_list_tickets_with_data(self, client, test_ticket, test_customer, as_user):
        response = client.get("/tickets", headers=as_user(test_customer))
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["tickets"]) == 1
        assert data["tickets"][0]["ticket_number"] == "BD-1001"

    def test_list_tickets_filter_by_status(self, client, test_ticket, test_customer, as_user):
        response = client.get("/tickets?status=OPEN", headers=as_user(test_customer))
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1

        response = client.get("/tickets?status=CLOSED", headers=as_user(test_customer))
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0


class TestTicketDetail:
    def test_get_ticket_detail(self, client, test_ticket, test_customer, as_user):
        response = client.get(f"/tickets/{test_ticket.id}", headers=as_user(test_customer))
        assert response.status_code == 200
        data = response.json()
        assert data["ticket_number"] == "BD-1001"
        assert data["subject"] == "Test ticket"
        assert data["messages"] == []

    def test_get_ticket_not_found(self, client, test_customer, as_user):
        response = client.get("/tickets/99999", headers=as_user(test_customer))
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "TICKET_NOT_FOUND"


class TestTicketAccessControl:
    """A customer must never learn that another customer's ticket exists at all
    (plan Appendix A, decision 9): the response is 404, the same as a ticket that truly
    does not exist, not 403.
    """

    def test_customer_cannot_read_another_customers_ticket(self, client, test_ticket, db, as_user):
        other = User(email="other@test.com", name="Other Customer", role=UserRole.CUSTOMER.value)
        db.add(other)
        db.commit()
        db.refresh(other)

        response = client.get(f"/tickets/{test_ticket.id}", headers=as_user(other))
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "TICKET_NOT_FOUND"

    def test_customer_does_not_appear_in_another_customers_ticket_list(self, client, test_ticket, db, as_user):
        other = User(email="other2@test.com", name="Other Customer 2", role=UserRole.CUSTOMER.value)
        db.add(other)
        db.commit()
        db.refresh(other)

        response = client.get("/tickets", headers=as_user(other))
        assert response.status_code == 200
        assert response.json()["tickets"] == []