"""Dev launcher: verify the database first, start the API only if it is reachable.

    cd backend
    python run.py

Why a launcher: `uvicorn --reload` binds the port before it imports the app, so a check
inside the app can never run "before the port". This does.
"""
import sys
from pathlib import Path

import uvicorn

from app.core.config import settings
from app.core.db_check import DatabaseConnectionError, check_database_connection

APP_DIR = Path(__file__).resolve().parent / "app"


def main() -> int:
    try:
        print(f"[ok] {check_database_connection()}")
    except DatabaseConnectionError as exc:
        print(exc, file=sys.stderr)
        print("API not started.", file=sys.stderr)
        return 1

    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=settings.port,
        reload=True,
        reload_dirs=[str(APP_DIR)],
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
