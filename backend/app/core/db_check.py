"""Startup database check that fails with a message a human can act on.

Deliberately does NOT import app.core.database: that module builds the real engine at
import time, so a bad DATABASE_URL would crash there before this check could explain it.

    python -m app.core.db_check      # from backend/: check only, exit code 0 or 1
"""
import re
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import ArgumentError, NoSuchModuleError, SQLAlchemyError
from sqlalchemy.pool import NullPool

from app.core.config import settings

CONNECT_TIMEOUT_SECONDS = 3  # per address; "localhost" tries ::1 and 127.0.0.1, so worst case is ~6s
EXPECTED_URL = "postgresql+psycopg://USER:PASSWORD@HOST:5432/DATABASE"


class DatabaseConnectionError(RuntimeError):
    """The message is already written for a human: print it as is."""


def _failure(target: str, problem: str, fix: str) -> DatabaseConnectionError:
    return DatabaseConnectionError(
        "\nDATABASE CONNECTION FAILED\n"
        f"  Target : {target}\n"
        f"  Problem: {problem}\n"
        f"  Fix    : {fix}\n"
    )


def _explain(raw: str, url: URL) -> tuple[str, str]:
    """Turn the driver's raw message into (problem, fix)."""
    low = raw.lower()
    user = url.username or "postgres"
    host = url.host or "localhost"
    port = url.port or 5432
    database = url.database or "(none)"

    if re.search(r'database ".*" does not exist', raw):
        return (
            f'The server at {host}:{port} is running, but database "{database}" does not exist on it.',
            f'Create it: psql -U {user} -c "CREATE DATABASE {database};"  '
            "or fix the database name at the end of DATABASE_URL.",
        )
    if "password authentication failed" in low or "authentication failed" in low:
        return (
            f'PostgreSQL rejected the login for user "{user}" (wrong password).',
            "Fix the user or password in DATABASE_URL (.env).",
        )
    if re.search(r'role ".*" does not exist', raw):
        return (
            f'PostgreSQL has no user (role) named "{user}".',
            "Fix the user name in DATABASE_URL (.env).",
        )
    if "no pg_hba.conf entry" in low:
        return (
            f'The server refuses connections for user "{user}" from this machine (pg_hba.conf).',
            "Allow this user/host in pg_hba.conf, or connect as a user that is allowed.",
        )
    if "starting up" in low or "shutting down" in low:
        return (
            "PostgreSQL is starting up or shutting down.",
            "Wait a few seconds and start the API again.",
        )
    if any(s in low for s in ("could not translate host name", "getaddrinfo", "name or service not known", "no such host")):
        return (
            f'The host name "{host}" cannot be resolved.',
            "Fix the host in DATABASE_URL (use localhost or 127.0.0.1 for a local server).",
        )
    # On Windows a stopped server or a closed port often shows up as a timeout instead of
    # "connection refused", so both are reported the same way.
    if any(s in low for s in (
        "connection refused", "10061", "could not connect", "is the server running",
        "timeout expired", "timed out", "10060",
    )):
        return (
            f"Cannot reach PostgreSQL at {host}:{port} (service not running, wrong port, or blocked by a firewall).",
            "Start the PostgreSQL service (Windows: Services > postgresql-x64-NN) "
            "and check the host and port in DATABASE_URL.",
        )
    first_line = raw.strip().splitlines()[0] if raw.strip() else "unknown error"
    return (
        f"Could not connect: {first_line}",
        "Check DATABASE_URL and that the PostgreSQL server is running.",
    )


def check_database_connection(database_url: str | None = None) -> str:
    """Open a real connection and run a query. Returns a one-line success summary.

    Raises DatabaseConnectionError (never a raw driver exception) when it cannot.
    """
    raw_url = settings.database_url if database_url is None else database_url

    try:
        url = make_url(raw_url)
    except ArgumentError:
        raise _failure(
            "DATABASE_URL",
            "DATABASE_URL is not a valid database URL.",
            f"Use this form in .env: DATABASE_URL={EXPECTED_URL}",
        ) from None

    target = url.render_as_string(hide_password=True)

    try:
        engine = create_engine(
            url,
            poolclass=NullPool,
            connect_args={"connect_timeout": CONNECT_TIMEOUT_SECONDS},
        )
    except (ImportError, NoSuchModuleError) as exc:
        raise _failure(
            target,
            f"The database driver named in DATABASE_URL is not available ({exc}).",
            "This project uses psycopg 3, so DATABASE_URL must start with "
            f"'postgresql+psycopg://'  e.g. {EXPECTED_URL}",
        ) from None

    try:
        with engine.connect() as conn:
            database, user, version = conn.execute(
                text("select current_database(), current_user, current_setting('server_version')")
            ).one()
    except SQLAlchemyError as exc:
        problem, fix = _explain(str(getattr(exc, "orig", exc)), url)
        raise _failure(target, problem, fix) from None
    except Exception as exc:  # noqa: BLE001 - last resort, still no raw traceback for the developer
        raise _failure(
            target,
            f"Unexpected {type(exc).__name__} while connecting: {exc}",
            "Check DATABASE_URL and that the PostgreSQL server is running.",
        ) from None
    finally:
        engine.dispose()

    return (
        f'Connected to PostgreSQL {version}: database "{database}" as user "{user}" '
        f"({url.host or 'localhost'}:{url.port or 5432})"
    )


def main() -> int:
    try:
        print(f"[ok] {check_database_connection()}")
    except DatabaseConnectionError as exc:
        print(exc, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
