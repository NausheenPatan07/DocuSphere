from flask import Blueprint, jsonify
import app.extensions as extensions

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def health_check():
    try:
        extensions.db.command("ping")

        return jsonify({
            "status": "success",
            "message": "DocuSphere API is running",
            "database": "connected"
        }), 200

    except Exception as e:
        print("Health check error:", e)

        return jsonify({
            "status": "error",
            "message": "Database connection failed"
        }), 503