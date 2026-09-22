"""The mock order endpoint's shape is fixed by the assignment's own example and needs no
authentication (plan section 40): it is a public, read-only lookup."""


def test_mock_order_matches_the_assignment_shape_exactly(client):
    response = client.get("/mock/orders/ORD-10293")
    assert response.status_code == 200
    assert response.json() == {
        "order_id": "ORD-10293",
        "destination": "Turkey",
        "package": "10 GB",
        "status": "completed",
        "esim_status": "installed",
    }


def test_mock_order_requires_no_authentication(client):
    # No X-User-Id header at all, and still not a 401.
    response = client.get("/mock/orders/ORD-10293")
    assert response.status_code == 200


def test_unknown_mock_order_is_404_with_the_standard_error_shape(client):
    response = client.get("/mock/orders/ORD-99999")
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "ORDER_NOT_FOUND"
