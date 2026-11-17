
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timezone
from bson import ObjectId

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


# Update a metadata field (Admin only)
@metadata_bp.route("/fields/<field_id>", methods=["PUT"])
@jwt_required()
@role_required("admin")
def update_metadata_field(field_id):

    if not ObjectId.is_valid(field_id):
        return jsonify({
            "status": "error",
            "message": "Invalid field ID"
        }), 400

    db = extensions.db
    field = db.metadata_fields.find_one({"_id": ObjectId(field_id)})

    if not field:
        return jsonify({
            "status": "error",
            "message": "Metadata field not found"
        }), 404

    data = request.get_json()

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "Request body must be a JSON object"
        }), 400

    # Key and type are immutable
    if "key" in data and data["key"] != field["key"]:
        return jsonify({
            "status": "error",
            "message": "Field key is immutable and cannot be changed"
        }), 400

    if "type" in data and data["type"] != field["type"]:
        return jsonify({
            "status": "error",
            "message": "Field type is immutable and cannot be changed"
        }), 400

    label = data.get("label")

    if not isinstance(label, str) or not label.strip():
        return jsonify({
            "status": "error",
            "message": "Field label is required"
        }), 400

    required = data.get("required")

    if required is None:
        required = field.get("required", False)
    elif not isinstance(required, bool):
        return jsonify({
            "status": "error",
            "message": "Required must be true or false"
        }), 400

    field_type = field.get("type")

    if field_type == "dropdown":
        options = data.get("options")

        if options is None:
            options = field.get("options", [])

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

        cleaned_options = [opt.strip() for opt in options]

    else:
        cleaned_options = []

    update_payload = {
        "label": label.strip(),
        "required": required,
        "options": cleaned_options,
        "updated_at": datetime.now(timezone.utc)
    }

    db.metadata_fields.update_one(
        {"_id": ObjectId(field_id)},
        {"$set": update_payload}
    )

    updated_field = db.metadata_fields.find_one({"_id": ObjectId(field_id)})

    return jsonify({
        "status": "success",
        "message": "Metadata field updated successfully",
        "field": {
            "id": str(updated_field["_id"]),
            "key": updated_field["key"],
            "label": updated_field["label"],
            "type": updated_field["type"],
            "required": updated_field["required"],
            "options": updated_field.get("options", [])
        }
    }), 200


# Deactivate a metadata field (Admin only - soft delete)
@metadata_bp.route("/fields/<field_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def deactivate_metadata_field(field_id):

    if not ObjectId.is_valid(field_id):
        return jsonify({
            "status": "error",
            "message": "Invalid field ID"
        }), 400

    db = extensions.db
    field = db.metadata_fields.find_one({"_id": ObjectId(field_id)})

    if not field:
        return jsonify({
            "status": "error",
            "message": "Metadata field not found"
        }), 404

    if not field.get("is_active", True):
        return jsonify({
            "status": "error",
            "message": "Metadata field is already deactivated"
        }), 400

    db.metadata_fields.update_one(
        {"_id": ObjectId(field_id)},
        {
            "$set": {
                "is_active": False,
                "deactivated_at": datetime.now(timezone.utc)
            }
        }
    )
    return jsonify({
        "status": "success",
        "message": "Metadata field deactivated successfully",
        "field_id": str(field["_id"]),
        "key": field["key"]
    }), 200
