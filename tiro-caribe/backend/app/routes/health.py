from flask import Blueprint

from app.db import get_db
from app.responses import ok

bp = Blueprint("health", __name__, url_prefix="/api")


@bp.get("/health")
def health():
    with get_db().cursor() as cur:
        cur.execute("SELECT COUNT(*) AS total FROM scores")
        total = cur.fetchone()["total"]
    return ok({"status": "ok", "database": "connected", "scores": total})