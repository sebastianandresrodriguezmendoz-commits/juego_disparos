import pymysql
from flask import Flask
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from app import db
from app.config import Config
from app.responses import fail
from app.routes import health, scores


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})
    db.init_app(app)
    app.register_blueprint(health.bp)
    app.register_blueprint(scores.bp)

    @app.errorhandler(HTTPException)
    def handle_http(error):
        return fail(error.description, error.code)

    @app.errorhandler(pymysql.MySQLError)
    def handle_db(_error):
        app.logger.exception("Database error")
        return fail("Error de base de datos. Revisa que MySQL este encendido en XAMPP.", 500)

    @app.errorhandler(Exception)
    def handle_unexpected(_error):
        app.logger.exception("Unexpected error")
        return fail("Error interno del servidor", 500)

    return app