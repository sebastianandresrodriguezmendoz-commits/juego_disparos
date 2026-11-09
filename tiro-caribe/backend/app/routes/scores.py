import re

from flask import Blueprint, request

from app.db import get_db
from app.ratelimit import allow
from app.responses import fail, ok

bp = Blueprint("scores", __name__, url_prefix="/api")

NICK_RE = re.compile(r"^[A-Za-z0-9_ ]{3,16}$")
MAX_SCORE = 500000
LEVEL_STEP = 1500


def _as_int(value):
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value


@bp.post("/scores")
def create_score():
    if not allow(request.remote_addr):
        return fail("Demasiados envios. Espera un momento.", 429)

    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return fail("Se esperaba un JSON valido", 400)

    nickname = body.get("nickname")
    nickname = " ".join(nickname.split()) if isinstance(nickname, str) else ""
    score = _as_int(body.get("score"))
    level = _as_int(body.get("level"))

    if not NICK_RE.match(nickname):
        return fail("El apodo debe tener de 3 a 16 caracteres: letras, numeros, espacios o _", 400)
    if score is None or not 1 <= score <= MAX_SCORE:
        return fail(f"El puntaje debe ser un entero entre 1 y {MAX_SCORE}", 400)
    if level is None or not 1 <= level <= 1 + score // LEVEL_STEP:
        return fail("El nivel no coincide con el puntaje", 400)

    with get_db().cursor() as cur:
        cur.execute(
            "INSERT INTO scores (nickname, score, level) VALUES (%s, %s, %s)",
            (nickname, score, level),
        )
        new_id = cur.lastrowid
        cur.execute("SELECT COUNT(*) + 1 AS position FROM scores WHERE score > %s", (score,))
        position = cur.fetchone()["position"]

    return ok(
        {"id": new_id, "nickname": nickname, "score": score, "level": level, "position": position},
        201,
    )


@bp.get("/scores")
def list_scores():
    limit = request.args.get("limit", default=10, type=int)
    limit = max(1, min(limit, 50))

    with get_db().cursor() as cur:
        cur.execute(
            "SELECT nickname, score, level, created_at FROM scores "
            "ORDER BY score DESC, created_at ASC LIMIT %s",
            (limit,),
        )
        rows = cur.fetchall()

    for index, row in enumerate(rows, start=1):
        row["position"] = index
        row["created_at"] = row["created_at"].isoformat()

    return ok(rows)