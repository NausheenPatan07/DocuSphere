

from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

import app.extensions as extensions
from app.utils.audit import record_audit_event


access_bp = Blueprint("access", __name__)


def make_active_request_key(document_id, user_id):
    """Generate a unique key for an active user-document request."""
    return f"{document_id}:{user_id}"


def serialize_request(access_request):
    """Convert MongoDB access-request data into JSON-safe values."""

    return {
        "id": str(access_request["_id"]),
        "document_id": str(access_request["document_id"]),
        "requested_by": str(access_request["requested_by"]),
        "requester_division_id": str(
            access_request["requester_division_id"]
        ),
        "document_owner_division_id": str(
            access_request["document_owner_division_id"]
        ),
        "reason": access_request.get("reason", ""),
        "status": access_request["status"],
        "created_at": access_request["created_at"].isoformat(),
        "updated_at": access_request["updated_at"].isoformat(),
        "reviewed_by": (
            str(access_request["reviewed_by"])
            if access_request.get("reviewed_by")
            else None
        ),
        "reviewed_at": (
            access_request["reviewed_at"].isoformat()
            if access_request.get("reviewed_at")
            else None
        ),
        "history": access_request.get("history", [])
    }


def get_active_user():
    """Return the authenticated active user."""

    user_id = get_jwt_identity()

    if not ObjectId.is_valid(user_id):
        return None

    return extensions.db.users.find_one({
        "_id": ObjectId(user_id),
        "is_active": True
    })


@access_bp.route("/request", methods=["POST"])
@jwt_required()
def request_document_access():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "Request body must be a JSON object"
        }), 400

    document_id = data.get("document_id")
    reason = data.get("reason", "")

    if (
        not isinstance(document_id, str)
        or not ObjectId.is_valid(document_id)
    ):
        return jsonify({
            "status": "error",
            "message": "A valid document ID is required"
        }), 400

    if not isinstance(reason, str) or len(reason) > 1000:
        return jsonify({
            "status": "error",
            "message": "Reason must be text with at most 1000 characters"
        }), 400

    user = get_active_user()

    if not user:
        return jsonify({
            "status": "error",
            "message": "User not found or inactive"
        }), 403

    db = extensions.db
    document_object_id = ObjectId(document_id)

    document = db.documents.find_one({
        "_id": document_object_id
    })

    if not document:
        return jsonify({
            "status": "error",
            "message": "Document not found"
        }), 404

    if user["division_id"] == document["division_id"]:
        return jsonify({
            "status": "error",
            "message": "You already belong to this document's division"
        }), 400

    active_key = make_active_request_key(
        document_object_id,
        user["_id"]
    )

    existing_request = db.access_requests.find_one({
        "document_id": document_object_id,
        "requested_by": user["_id"],
        "status": {"$in": ["pending", "approved"]}
    })

    if existing_request:
        return jsonify({
            "status": "error",
            "message": "An active access request already exists"
        }), 409

    now = datetime.now(timezone.utc)

    access_request = {
        "document_id": document_object_id,
        "requested_by": user["_id"],
        "requester_division_id": user["division_id"],
        "document_owner_division_id": document["division_id"],
        "reason": reason.strip(),
        "status": "pending",
        "active_request_key": active_key,
        "created_at": now,
        "updated_at": now,
        "reviewed_by": None,
        "reviewed_at": None,
        "history": [{
            "action": "requested",
            "performed_by": str(user["_id"]),
            "timestamp": now.isoformat()
        }]
    }

    try:
        result = db.access_requests.insert_one(access_request)

    except DuplicateKeyError:
        return jsonify({
            "status": "error",
            "message": "An active access request already exists"
        }), 409

    # Audit: access request created.
    record_audit_event(
        action="access_request_created",
        user=user,
        document_id=document_object_id,
        request_id=result.inserted_id,
        details={
            "status": "pending",
            "reason": reason.strip()
        }
    )

    return jsonify({
        "status": "success",
        "message": "Access request submitted successfully",
        "request_id": str(result.inserted_id),
        "request_status": "pending"
    }), 201


@access_bp.route("/inbox", methods=["GET"])
@jwt_required()
def get_access_request_inbox():

    user = get_active_user()

    if not user:
        return jsonify({
            "status": "error",
            "message": "User not found or inactive"
        }), 403

    if user["role"] == "admin":
        query = {"status": "pending"}

    elif user["role"] == "division_admin":
        query = {
            "document_owner_division_id": user["division_id"],
            "status": "pending"
        }

    else:
        return jsonify({
            "status": "error",
            "message": "Only administrators can view the approval inbox"
        }), 403

    db = extensions.db

    requests_list = list(
        db.access_requests.find(query).sort("created_at", -1)
    )

    results = []

    for item in requests_list:

        requester = db.users.find_one(
            {"_id": item["requested_by"]},
            {"name": 1, "email": 1}
        )

        document = db.documents.find_one(
            {"_id": item["document_id"]},
            {"filename": 1}
        )

        result = serialize_request(item)

        result["requester"] = (
            {
                "name": requester.get("name"),
                "email": requester.get("email")
            }
            if requester else None
        )

        result["filename"] = (
            document.get("filename") if document else None
        )

        results.append(result)

    return jsonify({
        "status": "success",
        "total": len(results),
        "requests": results
    }), 200


@access_bp.route("/approve", methods=["POST"])
@jwt_required()
def decide_access_request():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "Request body must be a JSON object"
        }), 400

    request_id = data.get("request_id")
    decision = data.get("decision")

    if (
        not isinstance(request_id, str)
        or not ObjectId.is_valid(request_id)
    ):
        return jsonify({
            "status": "error",
            "message": "A valid request ID is required"
        }), 400

    if decision not in ["approved", "rejected"]:
        return jsonify({
            "status": "error",
            "message": "Decision must be approved or rejected"
        }), 400

    user = get_active_user()

    if not user:
        return jsonify({
            "status": "error",
            "message": "User not found or inactive"
        }), 403

    if user["role"] not in ["admin", "division_admin"]:
        return jsonify({
            "status": "error",
            "message": "You are not authorized to review access requests"
        }), 403

    db = extensions.db
    request_object_id = ObjectId(request_id)

    access_request = db.access_requests.find_one({
        "_id": request_object_id
    })

    if not access_request:
        return jsonify({
            "status": "error",
            "message": "Access request not found"
        }), 404

    if access_request["requested_by"] == user["_id"]:
        return jsonify({
            "status": "error",
            "message": "You cannot review your own access request"
        }), 403

    if (
        user["role"] == "division_admin"
        and user["division_id"]
        != access_request["document_owner_division_id"]
    ):
        return jsonify({
            "status": "error",
            "message": "You can only review requests for your own division"
        }), 403

    now = datetime.now(timezone.utc)

    active_key = make_active_request_key(
        access_request["document_id"],
        access_request["requested_by"]
    )

    update_operation = {
        "$set": {
            "status": decision,
            "reviewed_by": user["_id"],
            "reviewed_at": now,
            "updated_at": now
        },
        "$push": {
            "history": {
                "action": decision,
                "performed_by": str(user["_id"]),
                "timestamp": now.isoformat()
            }
        }
    }

    if decision == "approved":

        # Keep the unique key while access is approved.
        update_operation["$set"]["active_request_key"] = active_key

    else:

        # Rejected requests can be submitted again.
        update_operation["$unset"] = {
            "active_request_key": ""
        }

    try:
        updated_request = db.access_requests.find_one_and_update(
            {
                "_id": request_object_id,
                "status": "pending"
            },
            update_operation,
            return_document=ReturnDocument.AFTER
        )

    except DuplicateKeyError:
        return jsonify({
            "status": "error",
            "message": "Another active request already exists for this document"
        }), 409

    if not updated_request:
        return jsonify({
            "status": "error",
            "message": "This request has already been processed"
        }), 409

    # Audit: request approved or rejected.
    record_audit_event(
        action=f"access_request_{decision}",
        user=user,
        document_id=updated_request["document_id"],
        request_id=updated_request["_id"],
        details={
            "requester_id": str(updated_request["requested_by"]),
            "status": decision
        }
    )

    return jsonify({
        "status": "success",
        "message": f"Access request {decision} successfully",
        "request": serialize_request(updated_request)
    }), 200


@access_bp.route("/my-requests", methods=["GET"])
@jwt_required()
def get_my_access_requests():

    user = get_active_user()

    if not user:
        return jsonify({
            "status": "error",
            "message": "User not found or inactive"
        }), 403

    requests_list = list(
        extensions.db.access_requests.find({
            "requested_by": user["_id"]
        }).sort("created_at", -1)
    )

    return jsonify({
        "status": "success",
        "total": len(requests_list),
        "requests": [
            serialize_request(item)
            for item in requests_list
        ]
    }), 200
