"""Error responses not already covered elsewhere: authentication failures (plan section
39), the validation error envelope, and what the client sees when the database itself
becomes unavailable mid-request (plan section 20) - never a raw SQL or driver message.
"""
from sqlalchemy.exc import OperationalError

from app.services.ticket_service import TicketService


class TestAuthenticationErrors:
    def test_missing_header_is_401(self, client):
        response = client.get("/tickets")
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "NOT_AUTHENTICATED"

    def test_non_numeric_header_is_401(self, client):
        response = client.get("/tickets", headers={"X-User-Id": "not-a-number"})
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "INVALID_USER_ID"

    def test_unknown_user_id_is_401(self, client):
        response = client.get("/tickets", headers={"X-User-Id": "999999"})
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "UNKNOWN_USER"


class TestValidationErrorShape:
    def test_validation_failure_uses_the_standard_error_envelope(self, client, test_customer, as_user):
        response = client.post(
            "/tickets",
            json={
                "customer_email": "not-an-email",
                "category": "CONNECTIVITY",
                "subject": "s",
                "description": "d",
                "priority": "LOW",
            },
            headers=as_user(test_customer),
        )
        assert response.status_code == 422
        body = response.json()
        assert body["error"]["code"] == "VALIDATION_ERROR"
        assert isinstance(body["error"]["details"]["errors"], list)


class TestDatabaseUnavailable:
    def test_a_database_failure_during_the_request_is_503(self, client, test_customer, as_user, monkeypatch):
        def broken_create_ticket(self, data, creator):
            raise OperationalError("insert into tickets ...", {}, Exception("connection lost"))

        monkeypatch.setattr(TicketService, "create_ticket", broken_create_ticket)

        response = client.post(
            "/tickets",
            json={
                "customer_email": "customer@test.com",
                "category": "OTHER",
                "subject": "s",
                "description": "d",
                "priority": "LOW",
            },
            headers=as_user(test_customer),
        )
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "DATABASE_UNAVAILABLE"
        # Never a raw SQL statement or driver message reaching the client.
        assert "insert into tickets" not in response.text
