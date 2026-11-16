
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
import re
import math

import app.extensions as extensions
from app.services.embedding_service import embedding_service, EMBEDDING_DIM


search_bp = Blueprint("search", __name__)


# ==========================================
# HELPER: GENERATE SEARCH SNIPPET
# ==========================================

def generate_snippet(text, pattern, context_before=80, context_after=120):

    if not isinstance(text, str) or not text:
        return ""

    match = re.search(pattern, text, re.IGNORECASE)

    if not match:
        return ""

    start = max(0, match.start() - context_before)
    end = min(len(text), match.end() + context_after)

    snippet = text[start:end]

    if start > 0:
        snippet = "..." + snippet

    if end < len(text):
        snippet += "..."

    return snippet


# ==========================================
# SEARCH DOCUMENTS
# GET /api/search?q=keyword
# ==========================================

@search_bp.route("", methods=["GET"])
@jwt_required()
def search_documents():

    db = extensions.db

    # --------------------------------------
    # 1. VALIDATE USER
    # --------------------------------------

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

    # --------------------------------------
    # 2. VALIDATE SEARCH KEYWORD
    # --------------------------------------

    keyword = request.args.get("q", "").strip()

    if len(keyword) < 2:
        return jsonify({
            "status": "error",
            "message": "Search keyword must contain at least 2 characters"
        }), 400

    if len(keyword) > 100:
        return jsonify({
            "status": "error",
            "message": "Search keyword cannot exceed 100 characters"
        }), 400

    # Escape special regex characters to prevent
    # unintended regular-expression patterns.
    search_pattern = re.escape(keyword)

    # --------------------------------------
    # 3. BUILD SEARCH CONDITIONS
    # --------------------------------------

    search_conditions = [
        {
            "filename": {
                "$regex": search_pattern,
                "$options": "i"
            }
        },
        {
            "extracted_text": {
                "$regex": search_pattern,
                "$options": "i"
            }
        }
    ]

    # Search all configured dynamic metadata fields.
    metadata_fields = db.metadata_fields.find(
        {},
        {"key": 1}
    )

    for field in metadata_fields:

        key = field.get("key")

        # Validate metadata key before using it
        # as a MongoDB field path.
        if key and re.fullmatch(r"[a-zA-Z][a-zA-Z0-9_]*", key):

            search_conditions.append({
                f"metadata.{key}": {
                    "$regex": search_pattern,
                    "$options": "i"
                }
            })

    # --------------------------------------
    # 4. APPLY DIVISION-LEVEL ACCESS CONTROL
    # --------------------------------------

    query = {
        "$or": search_conditions
    }

    # System admins can search across divisions.
    # Employees and division admins are restricted
    # to their own division.
    if user.get("role") != "admin":

        if not user.get("division_id"):
            return jsonify({
                "status": "error",
                "message": "User is not assigned to a division"
            }), 403

        query["division_id"] = user["division_id"]

    # --------------------------------------
    # 5. EXECUTE SEARCH
    # --------------------------------------

    documents = list(
        db.documents.find(query)
        .sort("_id", -1)
        .limit(50)
    )

    # --------------------------------------
    # 6. FORMAT SEARCH RESULTS
    # --------------------------------------

    results = []

    for document in documents:

        extracted_text = document.get("extracted_text", "")

        snippet = generate_snippet(
            extracted_text,
            search_pattern
        )

        # Convert metadata into JSON-safe values.
        metadata = document.get("metadata", {})

        if not isinstance(metadata, dict):
            metadata = {}

        results.append({

            "document_id": str(document["_id"]),

            "filename": document.get("filename", "Unknown"),

            "division_id": str(
                document.get("division_id", "")
            ),

            "metadata": metadata,

            "ocr_status": document.get(
                "ocr_status",
                "not_processed"
            ),

            "snippet": snippet,

            "upload_date": document[
                "_id"
            ].generation_time.isoformat()

        })

    # --------------------------------------
    # 7. RETURN RESPONSE
    # --------------------------------------

    return jsonify({

        "status": "success",

        "keyword": keyword,

        "total_results": len(results),

        "results": results

    }), 200


# ==========================================
# PHASE 2: AI SEMANTIC & HYBRID SEARCH HELPERS
# ==========================================

def get_authenticated_user(db):
    """
    Validate active JWT user and return (user, error_response).
    """
    user_id = get_jwt_identity()

    if not ObjectId.is_valid(user_id):
        return None, (jsonify({
            "status": "error",
            "message": "Invalid user identity"
        }), 401)

    user = db.users.find_one({
        "_id": ObjectId(user_id),
        "is_active": True
    })

    if not user:
        return None, (jsonify({
            "status": "error",
            "message": "User not found or inactive"
        }), 403)

    return user, None


def get_authorized_document_filter(user, db, require_embedding=False):
    """
    Build MongoDB query filter strictly enforcing division isolation
    and approved cross-division access under existing system rules.
    Admin: searches across all corporate divisions.
    Non-admin: restricted to own division + explicitly approved access-request docs.
    """
    conditions = []

    if user.get("role") != "admin":
        if not user.get("division_id"):
            return None, (jsonify({
                "status": "error",
                "message": "User is not assigned to a division"
            }), 403)

        # Retrieve documents for which this user has an approved cross-division access request
        approved_requests = list(db.access_requests.find({
            "requested_by": user["_id"],
            "status": "approved"
        }, {"document_id": 1}))

        approved_doc_ids = [
            req["document_id"] for req in approved_requests
            if ObjectId.is_valid(req.get("document_id"))
        ]

        if approved_doc_ids:
            conditions.append({
                "$or": [
                    {"division_id": user["division_id"]},
                    {"_id": {"$in": approved_doc_ids}}
                ]
            })
        else:
            conditions.append({"division_id": user["division_id"]})

    if require_embedding:
        conditions.append({
            "embedding": {
                "$exists": True,
                "$type": "array"
            }
        })

    if not conditions:
        return {}, None
    elif len(conditions) == 1:
        return conditions[0], None
    else:
        return {"$and": conditions}, None


# ==========================================
# SEMANTIC SEARCH
# GET /api/search/semantic?q=<query>
# ==========================================

@search_bp.route("/semantic", methods=["GET"])
@jwt_required()
def semantic_search():
    """
    AI-powered semantic vector search using all-MiniLM-L6-v2 embeddings
    and cosine similarity. Division-isolated before ranking.
    """
    db = extensions.db
    user, err = get_authenticated_user(db)
    if err:
        return err

    query_text = request.args.get("q", "").strip()

    if not query_text:
        return jsonify({
            "status": "error",
            "message": "Search query parameter 'q' is required"
        }), 400

    if len(query_text) < 2:
        return jsonify({
            "status": "error",
            "message": "Search query must contain at least 2 characters"
        }), 400

    if len(query_text) > 200:
        return jsonify({
            "status": "error",
            "message": "Search query cannot exceed 200 characters"
        }), 400

    try:
        limit = min(max(int(request.args.get("limit", 20)), 1), 50)
    except (ValueError, TypeError):
        limit = 20

    # Build authorization filter requiring embedding
    doc_filter, err = get_authorized_document_filter(user, db, require_embedding=True)
    if err:
        return err

    # Generate query embedding
    try:
        query_vector = embedding_service.generate_query_embedding(query_text)
        if query_vector is None:
            return jsonify({
                "status": "error",
                "message": "Unable to generate query embedding"
            }), 500
    except Exception as e:
        current_app.logger.exception("Semantic search query embedding error: %s", e)
        return jsonify({
            "status": "error",
            "message": "Semantic search service temporarily unavailable"
        }), 500

    # Query authorized candidate documents
    candidate_docs = list(db.documents.find(
        doc_filter,
        {
            "_id": 1,
            "filename": 1,
            "division_id": 1,
            "metadata": 1,
            "ocr_status": 1,
            "embedding": 1,
            "extracted_text": 1
        }
    ))

    scored_results = []
    for doc in candidate_docs:
        emb = doc.get("embedding")
        if not isinstance(emb, list) or len(emb) != EMBEDDING_DIM:
            continue

        try:
            if not all(isinstance(x, (int, float)) and math.isfinite(x) for x in emb):
                continue

            similarity = embedding_service.compute_similarity(query_vector, emb)
        except Exception:
            continue

        scored_results.append({
            "doc": doc,
            "similarity_score": round(float(similarity), 4)
        })

    # Sort descending by similarity
    scored_results.sort(key=lambda x: x["similarity_score"], reverse=True)
    top_items = scored_results[:limit]

    formatted_results = []
    for item in top_items:
        doc = item["doc"]
        sim_score = item["similarity_score"]
        extracted_text = doc.get("extracted_text", "")

        snippet = ""
        if extracted_text:
            try:
                snippet = embedding_service.extract_semantic_snippet(
                    extracted_text, query_vector, max_chars=200
                )
            except Exception:
                snippet = (extracted_text[:200] + "...") if len(extracted_text) > 200 else extracted_text

        metadata = doc.get("metadata", {})
        if not isinstance(metadata, dict):
            metadata = {}

        formatted_results.append({
            "document_id": str(doc["_id"]),
            "filename": doc.get("filename", "Unknown"),
            "division_id": str(doc.get("division_id", "")),
            "similarity_score": sim_score,
            "snippet": snippet,
            "metadata": metadata,
            "ocr_status": doc.get("ocr_status", "not_processed"),
            "upload_date": doc["_id"].generation_time.isoformat()
        })

    return jsonify({
        "status": "success",
        "query": query_text,
        "mode": "semantic",
        "total": len(formatted_results),
        "results": formatted_results
    }), 200


# ==========================================
# HYBRID SEARCH
# GET /api/search/hybrid?q=<query>
# ==========================================

@search_bp.route("/hybrid", methods=["GET"])
@jwt_required()
def hybrid_search():
    """
    Hybrid search combining keyword relevance (40%) and semantic similarity (60%).
    Normalized scoring guarantees comparable dimensions and fair ranking.
    """
    db = extensions.db
    user, err = get_authenticated_user(db)
    if err:
        return err

    query_text = request.args.get("q", "").strip()

    if not query_text:
        return jsonify({
            "status": "error",
            "message": "Search query parameter 'q' is required"
        }), 400

    if len(query_text) < 2:
        return jsonify({
            "status": "error",
            "message": "Search query must contain at least 2 characters"
        }), 400

    if len(query_text) > 200:
        return jsonify({
            "status": "error",
            "message": "Search query cannot exceed 200 characters"
        }), 400

    try:
        limit = min(max(int(request.args.get("limit", 20)), 1), 50)
    except (ValueError, TypeError):
        limit = 20

    # Fetch all authorized documents (even those without embeddings can still match keywords)
    doc_filter, err = get_authorized_document_filter(user, db, require_embedding=False)
    if err:
        return err

    candidate_docs = list(db.documents.find(
        doc_filter,
        {
            "_id": 1,
            "filename": 1,
            "division_id": 1,
            "metadata": 1,
            "ocr_status": 1,
            "embedding": 1,
            "extracted_text": 1
        }
    ))

    # Generate query embedding for semantic component
    query_vector = None
    try:
        query_vector = embedding_service.generate_query_embedding(query_text)
    except Exception as e:
        current_app.logger.warning("Hybrid search query embedding failed: %s", e)

    pattern = re.compile(re.escape(query_text), re.IGNORECASE)
    kw_weight = 0.4
    sem_weight = 0.6

    scored_items = []

    for doc in candidate_docs:
        filename = doc.get("filename", "")
        extracted_text = doc.get("extracted_text", "")
        metadata = doc.get("metadata", {})
        if not isinstance(metadata, dict):
            metadata = {}

        # 1. Compute Keyword Relevance (normalized to [0.0, 1.0])
        fn_matches = len(pattern.findall(filename))
        text_matches = len(pattern.findall(extracted_text)) if extracted_text else 0
        meta_matches = sum(len(pattern.findall(str(v))) for v in metadata.values())

        raw_tf = (3 * fn_matches) + text_matches + (2 * meta_matches)
        if raw_tf > 0:
            keyword_score = round(raw_tf / (raw_tf + 1.5), 4)
        else:
            keyword_score = 0.0

        # 2. Compute Semantic Similarity (normalized to [0.0, 1.0])
        semantic_score = 0.0
        emb = doc.get("embedding")
        if (
            query_vector is not None
            and isinstance(emb, list)
            and len(emb) == EMBEDDING_DIM
        ):
            try:
                if all(isinstance(x, (int, float)) and math.isfinite(x) for x in emb):
                    sim = embedding_service.compute_similarity(query_vector, emb)
                    semantic_score = round(float(sim), 4)
            except Exception:
                semantic_score = 0.0

        # 3. Calculate Combined Score
        combined_score = round((kw_weight * keyword_score) + (sem_weight * semantic_score), 4)

        # Include if matched keyword OR semantic similarity
        if combined_score > 0.0:
            scored_items.append({
                "doc": doc,
                "combined_score": combined_score,
                "keyword_score": keyword_score,
                "semantic_score": semantic_score,
                "text_matches": text_matches
            })

    # Sort descending by combined score
    scored_items.sort(key=lambda x: x["combined_score"], reverse=True)
    top_items = scored_items[:limit]

    formatted_results = []
    for item in top_items:
        doc = item["doc"]
        extracted_text = doc.get("extracted_text", "")
        metadata = doc.get("metadata", {})
        if not isinstance(metadata, dict):
            metadata = {}

        # Generate snippet: prefer keyword snippet if keyword matched in text, else semantic snippet
        snippet = ""
        if item["text_matches"] > 0:
            snippet = generate_snippet(extracted_text, re.escape(query_text))
        elif query_vector is not None and extracted_text:
            try:
                snippet = embedding_service.extract_semantic_snippet(
                    extracted_text, query_vector, max_chars=200
                )
            except Exception:
                snippet = (extracted_text[:200] + "...") if len(extracted_text) > 200 else extracted_text

        formatted_results.append({
            "document_id": str(doc["_id"]),
            "filename": doc.get("filename", "Unknown"),
            "division_id": str(doc.get("division_id", "")),
            "combined_score": item["combined_score"],
            "keyword_score": item["keyword_score"],
            "semantic_score": item["semantic_score"],
            "similarity_score": item["semantic_score"],
            "snippet": snippet,
            "metadata": metadata,
            "ocr_status": doc.get("ocr_status", "not_processed"),
            "upload_date": doc["_id"].generation_time.isoformat()
        })

    return jsonify({
        "status": "success",
        "query": query_text,
        "mode": "hybrid",
        "total": len(formatted_results),
        "weights": {
            "keyword": kw_weight,
            "semantic": sem_weight
        },
        "results": formatted_results
    }), 200
