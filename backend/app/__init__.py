
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from app.config import Config
from app.extensions import init_db

from app.routes.metadata import metadata_bp
from app.routes.access import access_bp
from app.routes.health import health_bp
from app.routes.auth import auth_bp
from app.routes.divisions import divisions_bp
from app.routes.documents import documents_bp
from app.routes.search import search_bp
from app.routes.audit import audit_bp


def create_app():

    app = Flask(__name__)

    # Load application configuration
    app.config.from_object(Config)

    # Configure CORS
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [app.config["FRONTEND_URL"]]
            }
        }
    )

    # Initialize JWT authentication
    JWTManager(app)

    # Initialize MongoDB and GridFS
    init_db(app)

    # Register API blueprints
    app.register_blueprint(
        health_bp,
        url_prefix="/api"
    )

    app.register_blueprint(
        auth_bp,
        url_prefix="/api/auth"
    )

    app.register_blueprint(
        divisions_bp,
        url_prefix="/api/divisions"
    )

    app.register_blueprint(
        documents_bp,
        url_prefix="/api/documents"
    )

    app.register_blueprint(
        metadata_bp,
        url_prefix="/api/metadata"
    )

    app.register_blueprint(
        access_bp,
        url_prefix="/api/access"
    )

    app.register_blueprint(
        search_bp,
        url_prefix="/api/search"
    )

    app.register_blueprint(
        audit_bp,
        url_prefix="/api/admin"
    )

    app.register_blueprint(
        audit_bp,
        url_prefix="/api/audit",
        name="audit_alias"
    )

    return app

