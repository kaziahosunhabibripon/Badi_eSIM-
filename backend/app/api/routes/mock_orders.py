from fastapi import APIRouter
from app.core.exceptions import NotFoundError
from app.schemas.order import MockOrderResponse

router = APIRouter(prefix="/mock/orders", tags=["mock-orders"])

# Read-only mock data (plan section 40): no real eSIM provider integration is required.
# The shape matches the assignment's own example exactly - order_id, destination,
# package, status, esim_status - and nothing else.
MOCK_ORDERS: dict[str, dict] = {
    "ORD-10293": {
        "order_id": "ORD-10293",
        "destination": "Turkey",
        "package": "10 GB",
        "status": "completed",
        "esim_status": "installed",
    },
    "ORD-10294": {
        "order_id": "ORD-10294",
        "destination": "Germany",
        "package": "5 GB",
        "status": "pending",
        "esim_status": "not_installed",
    },
    "ORD-10295": {
        "order_id": "ORD-10295",
        "destination": "Japan",
        "package": "20 GB",
        "status": "completed",
        "esim_status": "installed",
    },
}


@router.get("/{order_id}", response_model=MockOrderResponse)
def get_mock_order(order_id: str) -> MockOrderResponse:
    order = MOCK_ORDERS.get(order_id)
    if order is None:
        raise NotFoundError(f"No mock order with id {order_id}.", code="ORDER_NOT_FOUND")
    return MockOrderResponse(**order)
