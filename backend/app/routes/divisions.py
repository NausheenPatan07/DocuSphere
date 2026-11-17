
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

import app.extensions as extensions
from app.utils.decorators import role_required

divisions_bp = Blueprint("divisions", __name__)


@divisions_bp.route("/", methods=["GET"])
def get_divisions():
    divisions = extensions.db.divisions.find()

    result = []

    for division in divisions:
        result.append({
            "id": str(division["_id"]),
            "name": division["name"]
        })

    return jsonify(result), 200


@divisions_bp.route("/seed", methods=["POST"])
@jwt_required()
@role_required("admin")
def seed_divisions():
    db = extensions.db

    default_divisions = [
        {"name": "Engineering"},
        {"name": "Finance"},
        {"name": "Human Resources"}
    ]

    inserted = []

    for division in default_divisions:
        existing = db.divisions.find_one({
            "name": division["name"]
        })

        if not existing:
            result = db.divisions.insert_one(division)

            inserted.append({
                "id": str(result.inserted_id),
                "name": division["name"]
            })

    return jsonify({
        "message": "Division setup completed",
        "inserted": inserted
    }), 201
