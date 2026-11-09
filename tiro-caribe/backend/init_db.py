import pathlib

import pymysql

from app.config import Config


def main():
    name = Config.DB_NAME
    if not name.replace("_", "").isalnum():
        raise SystemExit("DB_NAME invalido: usa solo letras, numeros y guion bajo")

    schema = (pathlib.Path(__file__).parent / "schema.sql").read_text(encoding="utf-8")

    conn = pymysql.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        charset="utf8mb4",
        autocommit=True,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"CREATE DATABASE IF NOT EXISTS `{name}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
            cur.execute(f"USE `{name}`")
            for statement in schema.split(";"):
                if statement.strip():
                    cur.execute(statement)
    finally:
        conn.close()

    print(f"Base de datos '{name}' lista.")


if __name__ == "__main__":
    main()