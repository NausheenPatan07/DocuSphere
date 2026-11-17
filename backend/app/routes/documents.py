
from flask import (
    Blueprint,
    request,
    jsonify,
    send_file,
    current_app
)
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import date
import json
import io
import re

import app.extensions as extensions
from app.utils.audit import record_audit_event
from app.services.ocr_service import extract_document_text


documents_bp = Blueprint("documents", __name__)


# ==========================================
# 1. UPLOAD DOCUMENT
# ==========================================

@documents_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_document():

    user_id = get_jwt_identity()

    db = extensions.db
    fs = extensions.fs

    # Find logged-in user
    if not ObjectId.is_valid(user_id):
        return jsonify({
            "status": "error",
            "message": "Invalid user identity"
        }), 401

    user = db.users.find_one({
        "_id": ObjectId(user_id),
        "is_active": True
    })

    if not user:
        return jsonify({
            "status": "error",
            "message": "User not found or inactive"
        }), 403

    # Check uploaded file
    if "file" not in request.files:
        return jsonify({
            "status": "error",
            "message": "No file provided"
        }), 400

    file = request.files["file"]

    if not file.filename:
        return jsonify({
            "status": "error",
            "message": "Filename is required"
        }), 400

    # ======================================
    # READ AND PARSE METADATA JSON
    # ======================================

    metadata_json = request.form.get("metadata", "{}")

    current_app.logger.info(
        "Received metadata: %r",
        metadata_json
    )

    try:
        metadata = json.loads(metadata_json)

    except (json.JSONDecodeError, TypeError):
        return jsonify({
            "status": "error",
            "message": "Invalid metadata JSON",
            "received_metadata": metadata_json,
            "form_keys": list(request.form.keys())
        }), 400

    if not isinstance(metadata, dict):
        return jsonify({
            "status": "error",
            "message": "Metadata must be a JSON object"
        }), 400

    # ======================================
    # DYNAMIC METADATA VALIDATION
    # ======================================

    configured_fields = list(db.metadata_fields.find({
        "is_active": True
    }))

    allowed_metadata = {
        field["key"]: field
        for field in configured_fields
    }

    # Reject unknown metadata fields
    for key in metadata:

        if key not in allowed_metadata:
            return jsonify({
                "status": "error",
                "message": f"Unknown metadata field: {key}"
            }), 400

    # Validate configured fields
    for key, field in allowed_metadata.items():

        value = metadata.get(key)

        # Required field validation
        if field.get("required") and value in [None, ""]:
            return jsonify({
                "status": "error",
                "message": f"{field['label']} is required"
            }), 400

        if value in [None, ""]:
            continue

        # Dropdown validation
        if field["type"] == "dropdown":

            if (
                not isinstance(value, str)
                or value not in field.get("options", [])
            ):
                return jsonify({
                    "status": "error",
                    "message": f"Invalid value for {field['label']}"
                }), 400

        # Text and textarea validation
        elif field["type"] in ["text", "textarea"]:

            if not isinstance(value, str):
                return jsonify({
                    "status": "error",
                    "message": f"{field['label']} must be text"
                }), 400

        # Number validation
        elif field["type"] == "number":

            if isinstance(value, bool) or not isinstance(value, (int, float)):
                return jsonify({
                    "status": "error",
                    "message": f"{field['label']} must be a number"
                }), 400

        # Date validation
        elif field["type"] == "date":

            if not isinstance(value, str):
                return jsonify({
                    "status": "error",
                    "message": f"{field['label']} must be a date in YYYY-MM-DD format"
                }), 400

            try:
                date.fromisoformat(value)

            except ValueError:
                return jsonify({
                    "status": "error",
                    "message": f"Invalid date for {field['label']}"
                }), 400

    # ======================================
    # OCR TEXT EXTRACTION
    # ======================================

    file_bytes = file.read()

    extracted_text, ocr_status, ocr_error = (
        extract_document_text(
            file_bytes,
            file.content_type
        )
    )

    # ======================================
    # AI SEMANTIC EMBEDDING GENERATION
    # ======================================

    embedding = None
    embedding_model = None

    if extracted_text and ocr_status == "completed":
        try:
            from app.services.embedding_service import embedding_service, MODEL_NAME
            embedding = embedding_service.generate_document_embedding(extracted_text)
            embedding_model = MODEL_NAME
            current_app.logger.info("Generated embedding for %s (len: %s)", file.filename, len(embedding) if embedding else 0)
        except Exception as embed_err:
            current_app.logger.exception(
                "Semantic embedding generation failed for %s: %s",
                file.filename,
                embed_err
            )
            print(f"[!] EMBEDDING ERROR for {file.filename}: {embed_err}", flush=True)

    # ======================================
    # SAVE FILE TO GRIDFS
    # ======================================

    gridfs_id = fs.put(
        io.BytesIO(file_bytes),
        filename=file.filename,
        content_type=file.content_type,
        metadata={
            "uploaded_by": user_id,
            "division_id": str(user["division_id"])
        }
    )

    document = {
        "filename": file.filename,
        "content_type": file.content_type,
        "gridfs_id": gridfs_id,
        "uploaded_by": ObjectId(user_id),
        "division_id": user["division_id"],
        "metadata": metadata,
        "extracted_text": extracted_text,
        "ocr_status": ocr_status,
        "ocr_error": ocr_error,
        "embedding": embedding,
        "embedding_model": embedding_model
    }

    try:
        result = db.documents.insert_one(document)

    except Exception:
        fs.delete(gridfs_id)
        raise

    # ======================================
    # AUDIT LOGGING
    # ======================================

    record_audit_event(
        action="document_uploaded",
        user=user,
        document_id=result.inserted_id,
        details={
            "filename": file.filename,
            "content_type": file.content_type,
            "gridfs_id": str(gridfs_id),
            "ocr_status": ocr_status,
            "extracted_text_length": len(extracted_text)
        }
    )

    return jsonify({
        "status": "success",
        "message": "Document uploaded successfully",
        "document_id": str(result.inserted_id),
        "filename": file.filename,
        "division_id": str(user["division_id"]),
        "gridfs_id": str(gridfs_id),
        "ocr_status": ocr_status,
        "extracted_text_length": len(extracted_text)
    }), 201


# ==========================================
# 2. DOWNLOAD DOCUMENT
# ==========================================

@documents_bp.route("/<doc_id>/download", methods=["GET"])
@jwt_required()
def download_document(doc_id):

    if not ObjectId.is_valid(doc_id):
        return jsonify({
            "status": "error",
            "message": "Invalid document ID"
        }), 400

    user_id = get_jwt_identity()

    db = extensions.db
    fs = extensions.fs

    if not ObjectId.is_valid(user_id):
        return jsonify({
            "status": "error",
            "message": "Invalid user identity"
        }), 401

    user = db.users.find_one({
        "_id": ObjectId(user_id),
        "is_active": True
    })

    if not user:
        return jsonify({
            "status": "error",
            "message": "User not found or inactive"
        }), 403

    document = db.documents.find_one({
        "_id": ObjectId(doc_id)
    })

    if not document:
        return jsonify({
            "status": "error",
            "message": "Document not found"
        }), 404

    # Division-level authorization
    same_division = (
        user["division_id"] == document["division_id"]
    )

    # Cross-division access requires approval
    if not same_division:

        approved_request = db.access_requests.find_one({
            "document_id": document["_id"],
            "requested_by": user["_id"],
            "document_owner_division_id": document["division_id"],
            "status": "approved"
        })

        if not approved_request:
            return jsonify({
                "status": "error",
                "message": "Cross-division access has not been approved"
            }), 403

    # Retrieve file from GridFS
    try:
        grid_out = fs.get(document["gridfs_id"])
        file_data = io.BytesIO(grid_out.read())

    except Exception:
        current_app.logger.exception(
            "Document download failed for document ID: %s",
            doc_id
        )

        return jsonify({
            "status": "error",
            "message": "Unable to download document"
        }), 500

    # Audit successful download
    record_audit_event(
        action="document_downloaded",
        user=user,
        document_id=document["_id"],
        details={
            "filename": document["filename"],
            "content_type": document.get("content_type"),
            "division_id": str(user["division_id"]),
            "access_type": (
                "same_division"
                if same_division
                else "approved_cross_division"
            )
        }
    )

    return send_file(
        file_data,
        mimetype=document.get(
            "content_type",
            "application/octet-stream"
        ),
        as_attachment=True,
        download_name=document["filename"]
    )


# ==========================================
# 3. GET DOCUMENTS
# ==========================================

@documents_bp.route("", methods=["GET"])
@documents_bp.route("/", methods=["GET"])
@jwt_required()
def get_documents():

    db = extensions.db

    user_id = get_jwt_identity()

    if not ObjectId.is_valid(user_id):
        return jsonify({
            "status": "error",
            "message": "Invalid user identity"
        }), 401

    user = db.users.find_one({
        "_id": ObjectId(user_id),
        "is_active": True
    })

    if not user:
        return jsonify({
            "status": "error",
            "message": "User not found or inactive"
        }), 403

    # Admin can view all documents
    if user.get("role") == "admin":
        query = {}

    else:
        query = {
            "division_id": user["division_id"]
        }

    # Optional filename search
    search_text = request.args.get("q", "").strip()

    if search_text:
        query["filename"] = {
            "$regex": re.escape(search_text),
            "$options": "i"
        }

    # ==========================================
    # DYNAMIC METADATA FILTERING
    # ==========================================

    RESERVED_PARAMS = {"q", "page", "limit"}

    # Load active metadata field definitions
    active_fields = list(db.metadata_fields.find({
        "is_active": True
    }))

    # Map normalized representations of field keys and labels to canonical field definitions
    field_map = {}

    for field in active_fields:
        canonical_key = field.get("key")
        label = field.get("label", "")

        if not canonical_key:
            continue

        field_map[canonical_key.lower()] = field
        field_map[canonical_key.lower().replace("_", " ")] = field

        if label:
            field_map[label.lower()] = field
            field_map[label.lower().replace(" ", "_")] = field
            field_map[" ".join(label.lower().split())] = field

    for param_key, param_val in request.args.items():
        norm_param = param_key.strip().lower()

        if norm_param in RESERVED_PARAMS:
            continue

        # Strictly allow only configured active metadata fields
        if norm_param in field_map:
            target_field = field_map[norm_param]
            canonical_key = target_field["key"]
            field_type = target_field.get("type", "text")
            val = param_val.strip()

            if val:
                if field_type == "dropdown":
                    # Case-insensitive exact matching for dropdowns
                    query[f"metadata.{canonical_key}"] = {
                        "$regex": f"^{re.escape(val)}$",
                        "$options": "i"
                    }
                else:
                    # Escaped, case-insensitive partial matching for text/other fields
                    query[f"metadata.{canonical_key}"] = {
                        "$regex": re.escape(val),
                        "$options": "i"
                    }

    documents = db.documents.find(query).sort("_id", -1)

    result = []

    for document in documents:

        uploader = db.users.find_one({
            "_id": document["uploaded_by"]
        })

        result.append({
            "id": str(document["_id"]),
            "filename": document["filename"],
            "content_type": document.get("content_type"),
            "division_id": str(document["division_id"]),
            "uploaded_by": uploader["name"] if uploader else "Unknown",
            "metadata": document.get("metadata", {}),
            "ocr_status": document.get("ocr_status", "not_processed"),
            "upload_date": document["_id"].generation_time.isoformat()
        })

    return jsonify({
        "status": "success",
        "total": len(result),
        "documents": result
    }), 200
