"""Domain exceptions mapped to HTTP responses by the handlers registered in `app.main`.

Routes and services raise these instead of building an HTTPException or picking a status
code themselves: the mapping from a business situation to an HTTP status lives in exactly
one place (the handlers), and every error response has the same shape:

    {"error": {"code": "...", "message": "...", "details": {...}}}
"""
from typing import Any, Optional


class AppError(Exception):
    """Base class for errors the API turns into a JSON error response.

    `code` is a stable, machine-readable identifier a client can branch on; `message` is
    the human-readable text; `details` carries structured extras (for example the `from`
    and `to` states of a rejected transition). Subclasses set a default `status_code` and
    `code`; both can still be overridden per call site.
    """

    status_code: int = 500
    code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, *, code: Optional[str] = None, details: Optional[dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        if code is not None:
            self.code = code
        self.details = details or {}


class UnauthorizedError(AppError):
    """The caller did not identify themselves, or the identity given is not valid."""

    status_code = 401
    code = "NOT_AUTHENTICATED"


class ForbiddenError(AppError):
    """The caller is known but is not allowed to perform this action."""

    status_code = 403
    code = "FORBIDDEN"


class NotFoundError(AppError):
    """The requested resource does not exist, or the caller must not learn that it does."""

    status_code = 404
    code = "NOT_FOUND"


class ConflictError(AppError):
    """The request is well-formed but conflicts with the current state of the resource."""

    status_code = 409
    code = "CONFLICT"
