from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from bson import ObjectId

import app.extensions as extensions
from app.utils.decorators import role_required

audit_bp = Blueprint("audit", __name__)

SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "secret_key",
    "authorization",
    "api_key"
}


def sanitize_details(details):
    """
    Remove any sensitive keys from audit event details
    and ensure BSON types like ObjectId are converted to strings.
    """
    if not isinstance(details, dict):
        return {}
    sanitized = {}
    for key, val in details.items():
        if key.lower() in SENSITIVE_KEYS:
            continue
        if isinstance(val, ObjectId):
            sanitized[key] = str(val)
        else:
            sanitized[key] = val
    return sanitized


@audit_bp.route("/audit-logs", methods=["GET"], strict_slashes=False)
@audit_bp.route("/logs", methods=["GET"], strict_slashes=False)
@jwt_required()
@role_required("admin")
def get_audit_logs():
    """
    Retrieve paginated audit logs for administrators.
    Supports query parameters:
      - page: int (default 1)
      - limit: int (default 20, maximum 100)
      - action: string (optional event filter)
    """
    db = extensions.db

    # Parse and validate pagination parameters
    try:
        page = max(int(request.args.get("page", 1)), 1)
    except (ValueError, TypeError):
        page = 1

    try:
        limit = min(max(int(request.args.get("limit", 20)), 1), 100)
    except (ValueError, TypeError):
        limit = 20

    # Build MongoDB query filter
    query = {}
    action_filter = request.args.get("action", "").strip()
    if action_filter:
        query["action"] = action_filter

    # Count total matching records
    total_records = db.audit_logs.count_documents(query)
    total_pages = (total_records + limit - 1) // limit if total_records > 0 else 0

    skip = (page - 1) * limit

    # Query records sorted by created_at descending (with _id descending tie-breaker)
    cursor = db.audit_logs.find(query).sort([("created_at", -1), ("_id", -1)]).skip(skip).limit(limit)
    raw_records = list(cursor)

    # Collect unique actor_ids and document_ids for batch resolution
    actor_ids = set()
    doc_ids = set()

    for r in raw_records:
        actor_id = r.get("actor_id")
        if actor_id:
            if isinstance(actor_id, ObjectId):
                actor_ids.add(actor_id)
            elif ObjectId.is_valid(str(actor_id)):
                actor_ids.add(ObjectId(str(actor_id)))

        doc_id = r.get("document_id")
        if doc_id:
            if isinstance(doc_id, ObjectId):
                doc_ids.add(doc_id)
            elif ObjectId.is_valid(str(doc_id)):
                doc_ids.add(ObjectId(str(doc_id)))

    # Batch fetch actor details
    users_map = {}
    if actor_ids:
        for u in db.users.find({"_id": {"$in": list(actor_ids)}}, {"name": 1, "email": 1}):
            users_map[str(u["_id"])] = {
                "name": u.get("name"),
                "email": u.get("email")
            }

    # Batch fetch document details
    docs_map = {}
    if doc_ids:
        for d in db.documents.find({"_id": {"$in": list(doc_ids)}}, {"filename": 1}):
            docs_map[str(d["_id"])] = {
                "filename": d.get("filename")
            }

    # Format records with populated fields and sanitized details
    formatted_records = []
    for r in raw_records:
        actor_id_str = str(r["actor_id"]) if r.get("actor_id") else None
        actor_info = users_map.get(actor_id_str, {}) if actor_id_str else {}

        # Resolve document filename: prefer current document filename, fallback to details.filename
        doc_id_str = str(r["document_id"]) if r.get("document_id") else None
        doc_info = docs_map.get(doc_id_str, {}) if doc_id_str else {}
        document_filename = doc_info.get("filename")
        if not document_filename and isinstance(r.get("details"), dict):
            document_filename = r["details"].get("filename")

        # Format timestamp
        created_at_val = r.get("created_at")
        if hasattr(created_at_val, "isoformat"):
            created_at_str = created_at_val.isoformat()
        elif created_at_val is not None:
            created_at_str = str(created_at_val)
        else:
            created_at_str = None

        formatted_records.append({
            "id": str(r["_id"]),
            "_id": str(r["_id"]),
            "action": r.get("action"),
            "actor_id": actor_id_str,
            "actor_name": actor_info.get("name"),
            "actor_email": actor_info.get("email"),
            "actor_role": r.get("actor_role"),
            "actor_division_id": str(r["actor_division_id"]) if r.get("actor_division_id") else None,
            "document_id": doc_id_str,
            "document_filename": document_filename,
            "access_request_id": str(r["access_request_id"]) if r.get("access_request_id") else None,
            "details": sanitize_details(r.get("details")),
            "created_at": created_at_str
        })

    return jsonify({
        "status": "success",
        "logs": formatted_records,
        "audit_logs": formatted_records,
        "total": total_records,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_records": total_records,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }), 200
