"""Workflow and audit-trail tests: status transitions stay valid and fully audited.

These cover the second example the assignment asks for ("changing ticket status creates
the expected audit-history entry") and the transaction rule from plan section 12.
"""
from app.models.ticket import TicketStatus


class TestStatusWorkflow:
    def test_status_change_creates_audit_event(self, client, test_ticket, test_agent, as_user):
        response = client.patch(
            f"/tickets/{test_ticket.id}",
            json={"status": TicketStatus.IN_PROGRESS.value},
            headers=as_user(test_agent),
        )
        assert response.status_code == 200
        assert response.json()["status"] == TicketStatus.IN_PROGRESS.value

        detail = client.get(f"/tickets/{test_ticket.id}", headers=as_user(test_agent))
        assert detail.status_code == 200
        events = detail.json()["events"]
        status_events = [e for e in events if e["event_type"] == "STATUS_CHANGED"]
        assert len(status_events) == 1
        assert status_events[0]["old_value"] == TicketStatus.OPEN.value
        assert status_events[0]["new_value"] == TicketStatus.IN_PROGRESS.value

    def test_invalid_transition_is_rejected(self, client, test_ticket, test_agent, as_user):
        # OPEN -> CLOSED is not in the transition map, so it must be refused.
        response = client.patch(
            f"/tickets/{test_ticket.id}",
            json={"status": TicketStatus.CLOSED.value},
            headers=as_user(test_agent),
        )
        assert response.status_code == 409
        error = response.json()["error"]
        assert error["code"] == "INVALID_STATUS_TRANSITION"
        assert error["details"] == {"from": "OPEN", "to": "CLOSED"}

        detail = client.get(f"/tickets/{test_ticket.id}", headers=as_user(test_agent))
        assert detail.json()["status"] == TicketStatus.OPEN.value
        assert detail.json()["events"] == []

    def test_customer_cannot_update_ticket(self, client, test_ticket, test_customer, as_user):
        response = client.patch(
            f"/tickets/{test_ticket.id}",
            json={"status": TicketStatus.IN_PROGRESS.value},
            headers=as_user(test_customer),
        )
        assert response.status_code == 403


class TestAssignmentAndPriority:
    def test_assignment_creates_audit_event(self, client, test_ticket, test_agent, as_user):
        response = client.patch(
            f"/tickets/{test_ticket.id}",
            json={"assigned_agent_id": test_agent.id},
            headers=as_user(test_agent),
        )
        assert response.status_code == 200
        assert response.json()["assigned_agent_id"] == test_agent.id

        detail = client.get(f"/tickets/{test_ticket.id}", headers=as_user(test_agent))
        assignment_events = [
            e for e in detail.json()["events"] if e["event_type"] == "ASSIGNED"
        ]
        assert len(assignment_events) == 1
        assert assignment_events[0]["new_value"] == test_agent.name

    def test_priority_change_creates_audit_event(self, client, test_ticket, test_agent, as_user):
        response = client.patch(
            f"/tickets/{test_ticket.id}",
            json={"priority": "HIGH"},
            headers=as_user(test_agent),
        )
        assert response.status_code == 200
        assert response.json()["priority"] == "HIGH"

        detail = client.get(f"/tickets/{test_ticket.id}", headers=as_user(test_agent))
        priority_events = [
            e for e in detail.json()["events"] if e["event_type"] == "PRIORITY_CHANGED"
        ]
        assert len(priority_events) == 1
        assert priority_events[0]["old_value"] == "MEDIUM"
        assert priority_events[0]["new_value"] == "HIGH"

    def test_unassigning_an_already_unassigned_ticket_writes_no_audit_event(self, client, test_ticket, test_agent, as_user):
        # test_ticket starts with no assignee. Sending an explicit null is a no-op, not
        # a None -> None ASSIGNED event.
        response = client.patch(
            f"/tickets/{test_ticket.id}",
            json={"assigned_agent_id": None},
            headers=as_user(test_agent),
        )
        assert response.status_code == 200
        assert response.json()["assigned_agent_id"] is None

        detail = client.get(f"/tickets/{test_ticket.id}", headers=as_user(test_agent))
        assert detail.json()["events"] == []

    def test_unassign_after_assignment_writes_an_audit_event(self, client, test_ticket, test_agent, as_user):
        client.patch(
            f"/tickets/{test_ticket.id}",
            json={"assigned_agent_id": test_agent.id},
            headers=as_user(test_agent),
        )

        response = client.patch(
            f"/tickets/{test_ticket.id}",
            json={"assigned_agent_id": None},
            headers=as_user(test_agent),
        )
        assert response.status_code == 200
        assert response.json()["assigned_agent_id"] is None

        detail = client.get(f"/tickets/{test_ticket.id}", headers=as_user(test_agent))
        assignment_events = [e for e in detail.json()["events"] if e["event_type"] == "ASSIGNED"]
        assert len(assignment_events) == 2
        assert assignment_events[0]["new_value"] == test_agent.name
        assert assignment_events[1]["old_value"] == test_agent.name
        assert assignment_events[1]["new_value"] is None

    def test_invalid_agent_id_is_404(self, client, test_ticket, test_agent, as_user):
        response = client.patch(
            f"/tickets/{test_ticket.id}",
            json={"assigned_agent_id": 999999},
            headers=as_user(test_agent),
        )
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "AGENT_NOT_FOUND"

