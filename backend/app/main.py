import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api import api_router
from app.core.config import settings
from app.core.database import get_db
from app.core.db_check import check_database_connection
from app.core.exceptions import AppError

logger = logging.getLogger("app")

# Status codes FastAPI/Starlette can still raise on their own (an unmatched route, a
# disallowed method) get a code from here; everything raised by our own code goes
# through AppError instead and carries its own code.
_CODE_BY_STATUS = {401: "NOT_AUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}


def _error_body(code: str, message: str, details: dict | None = None) -> dict:
    return {"error": {"code": code, "message": message, "details": details or {}}}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Refuse to start if the database is unreachable, with a message a human can act on
    (plan section 20), instead of answering every request with a confusing 500 later.

    Starlette only sends the ASGI lifespan events when TestClient is used as a context
    manager (`with TestClient(app) as client`); the test fixtures use `TestClient(app)`
    directly, so this never runs under pytest and the suite never depends on PostgreSQL.
    """
    print(f"[startup] {check_database_connection()}")
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Credentials are not used (the demo identity travels as a header, not a cookie), so an
# explicit origin allow-list can be combined with allow_credentials=False; a wildcard
# origin together with allow_credentials=True is invalid and browsers reject it outright.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


# One set of handlers (plan section 20): every error response has the same
# {"error": {"code", "message", "details"}} shape, and nothing here ever forwards a raw
# SQL error, driver message or stack trace to the client.


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content=_error_body(exc.code, exc.message, exc.details))


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    # Covers cases FastAPI/Starlette raise on their own (unmatched route, wrong method)
    # rather than our own code, which raises AppError instead.
    code = _CODE_BY_STATUS.get(exc.status_code, "HTTP_ERROR")
    message = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return JSONResponse(status_code=exc.status_code, content=_error_body(code, message), headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content=_error_body(
            "VALIDATION_ERROR", "The request could not be validated.", {"errors": jsonable_encoder(exc.errors())}
        ),
    )


@app.exception_handler(OperationalError)
async def database_unavailable_handler(request: Request, exc: OperationalError):
    logger.error("Database error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=503,
        content=_error_body("DATABASE_UNAVAILABLE", "The database is temporarily unavailable. Please try again."),
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(status_code=500, content=_error_body("INTERNAL_ERROR", "An unexpected error occurred."))


@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    # Goes through the same overridable get_db as every other route (rather than a
    # module-level engine reference), so it checks whichever database the app is
    # actually configured against right now - including in tests.
    try:
        db.execute(text("select 1"))
    except OperationalError:
        return JSONResponse(status_code=503, content={"status": "degraded", "database": "down"})
    return {"status": "ok", "database": "up"}


@app.get("/")
async def root():
    return {"message": settings.app_name, "version": settings.app_version}
