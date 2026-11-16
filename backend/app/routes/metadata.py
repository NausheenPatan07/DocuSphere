
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timezone

import app.extensions as extensions
from app.utils.decorators import role_required

metadata_bp = Blueprint("metadata", __name__)


# Get all active metadata fields
@metadata_bp.route("/fields", methods=["GET"])
@jwt_required()
def get_metadata_fields():

    fields = extensions.db.metadata_fields.find({
        "is_active": True
    })

    result = []

    for field in fields:
        result.append({
            "id": str(field["_id"]),
            "key": field["key"],
            "label": field["label"],
            "type": field["type"],
            "required": field["required"],
            "options": field.get("options", [])
        })

    return jsonify({
        "status": "success",
        "total": len(result),
        "fields": result
    }), 200


# Create a new metadata field (Admin only)
@metadata_bp.route("/fields", methods=["POST"])
@jwt_required()
@role_required("admin")
def create_metadata_field():

    data = request.get_json()

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "Request body must be a JSON object"
        }), 400

    key = data.get("key")
    label = data.get("label")
    field_type = data.get("type")
    required = data.get("required", False)
    options = data.get("options", [])

    if not isinstance(key, str) or not key.strip():
        return jsonify({
            "status": "error",
            "message": "Field key is required"
        }), 400

    if not isinstance(label, str) or not label.strip():
        return jsonify({
            "status": "error",
            "message": "Field label is required"
        }), 400

    allowed_types = ["text", "number", "date", "dropdown", "textarea"]

    if field_type not in allowed_types:
        return jsonify({
            "status": "error",
            "message": "Invalid field type"
        }), 400

    if not isinstance(required, bool):
        return jsonify({
            "status": "error",
            "message": "Required must be true or false"
        }), 400

    if field_type == "dropdown":
        if not isinstance(options, list) or not options:
            return jsonify({
                "status": "error",
                "message": "Dropdown fields must have options"
            }), 400

        if not all(isinstance(option, str) and option.strip() for option in options):
            return jsonify({
                "status": "error",
                "message": "Every dropdown option must be a non-empty string"
            }), 400

    else:
        options = []

    db = extensions.db

    key = key.strip().lower()

    if db.metadata_fields.find_one({"key": key}):
        return jsonify({
            "status": "error",
            "message": "A metadata field with this key already exists"
        }), 409

    metadata_field = {
        "key": key,
        "label": label.strip(),
        "type": field_type,
        "required": required,
        "options": options,
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }

    result = db.metadata_fields.insert_one(metadata_field)

    return jsonify({
        "status": "success",
        "message": "Metadata field created successfully",
        "field_id": str(result.inserted_id),
        "key": key
    }), 201
