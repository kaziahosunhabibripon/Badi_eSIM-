from fastapi import APIRouter
from app.api.routes import tickets, messages, mock_orders, websocket, users

api_router = APIRouter()

api_router.include_router(tickets.router)
api_router.include_router(messages.router)
api_router.include_router(mock_orders.router)
api_router.include_router(websocket.router)
api_router.include_router(users.router)