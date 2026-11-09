import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "tiro_caribe")
    CORS_ORIGINS = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "").split(",")
        if o.strip()
    ]