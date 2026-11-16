
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from bson import ObjectId
import re
import app.extensions as extensions

from flask_jwt_extended import jwt_required
from app.utils.decorators import role_required

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data:
        return jsonify({"message": "Request body is required"}), 400

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    division_id = data.get("division_id", "")

    if not all([name, email, password, division_id]):
        return jsonify({"message": "All fields are required"}), 400

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"message": "Invalid email address"}), 400

    if len(password) < 8:
        return jsonify({"message": "Password must contain at least 8 characters"}), 400

    if not ObjectId.is_valid(division_id):
        return jsonify({"message": "Invalid division ID"}), 400

    db = extensions.db

    if db.users.find_one({"email": email}):
        return jsonify({"message": "Email already registered"}), 409

    division = db.divisions.find_one({"_id": ObjectId(division_id)})

    if not division:
        return jsonify({"message": "Division not found"}), 404

    user = {
        "name": name,
        "email": email,
        "password_hash": generate_password_hash(password),
        "division_id": ObjectId(division_id),
        "role": "employee",
        "is_active": True
    }

    result = db.users.insert_one(user)

    return jsonify({
        "status": "success",
        "message": "Registration successful",
        "user_id": str(result.inserted_id),
        "role": "employee"
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"message": "Request body is required"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    db = extensions.db
    user = db.users.find_one({"email": email})

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"message": "Invalid email or password"}), 401

    if not user.get("is_active", True):
        return jsonify({"message": "Account is inactive"}), 403

    access_token = create_access_token(
        identity=str(user["_id"]),
        additional_claims={
            "role": user["role"],
            "division_id": str(user["division_id"])
        }
    )

    return jsonify({
        "status": "success",
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "division_id": str(user["division_id"])
        }
    }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()

    user = extensions.db.users.find_one({
        "_id": ObjectId(user_id)
    })

    if not user:
        return jsonify({
            "status": "error",
            "message": "User not found"
        }), 404

    division = extensions.db.divisions.find_one({
        "_id": user["division_id"]
    })

    return jsonify({
        "status": "success",
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "division_id": str(user["division_id"]),
            "division_name": division["name"] if division else None
        }
    }), 200

@auth_bp.route("/admin-test", methods=["GET"])
@jwt_required()
@role_required("admin")
def admin_test():
    return jsonify({
        "status": "success",
        "message": "Admin access granted"
    }), 200
