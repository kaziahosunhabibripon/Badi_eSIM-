from pydantic import BaseModel


class MockOrderResponse(BaseModel):
    """Shape fixed by the assignment's own example (`GET /mock/orders/ORD-10293`).

    No `customer_email` here: this endpoint has no authentication (it is a public,
    read-only lookup, like the assignment's own example), and including it would let any
    caller read another customer's email address.
    """

    order_id: str
    destination: str
    package: str
    status: str
    esim_status: str
