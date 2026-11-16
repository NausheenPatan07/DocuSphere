
from datetime import datetime, timezone

from bson import ObjectId
from flask import current_app


def record_audit_event(
    action,
    user,
    document_id=None,
    request_id=None,
    details=None
):
    """
    Record an auditable user action.

    Audit failures are logged without changing the result
    of an already completed business operation.
    """

    try:
        event = {
            "action": action,
            "actor_id": user["_id"],
            "actor_role": user.get("role"),
            "actor_division_id": user.get("division_id"),
            "document_id": (
                ObjectId(document_id)
                if document_id and ObjectId.is_valid(str(document_id))
                else None
            ),
            "access_request_id": (
                ObjectId(request_id)
                if request_id and ObjectId.is_valid(str(request_id))
                else None
            ),
            "details": details or {},
            "created_at": datetime.now(timezone.utc)
        }

        from app.extensions import db
        db.audit_logs.insert_one(event)

    except Exception:
        current_app.logger.exception(
            "Failed to record audit event: %s",
            action
        )
