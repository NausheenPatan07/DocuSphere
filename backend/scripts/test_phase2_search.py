import sys
import os
import requests
import json
from bson import ObjectId

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
import app.extensions as extensions

BASE_URL = "http://127.0.0.1:5000"

print("=" * 70)
print("DOCUSPHERE PHASE 2: SEMANTIC & HYBRID SEARCH API TEST SUITE")
print("=" * 70)

# -------------------------------------------------------------
# Setup & Auth
# -------------------------------------------------------------
print("\n[Setup] Authenticating test users...")

# Admin
admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "nausheen.test@example.com",
    "password": "DocuSphere@123"
})
assert admin_resp.status_code == 200, f"Admin login failed: {admin_resp.text}"
admin_token = admin_resp.json()["access_token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}
print("  -> Admin authenticated.")

# Finance Employee
fin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "finance.test@example.com",
    "password": "Finance@123"
})
assert fin_resp.status_code == 200, f"Finance login failed: {fin_resp.text}"
fin_token = fin_resp.json()["access_token"]
fin_headers = {"Authorization": f"Bearer {fin_token}"}
print("  -> Finance employee authenticated.")

app = create_app()

test_results = {}

# -------------------------------------------------------------
# Test 1: Semantic search returns relevant documents for natural language query
# -------------------------------------------------------------
print("\n--- Test 1: Semantic Search with Natural Language Query ---")
t1_resp = requests.get(
    f"{BASE_URL}/api/search/semantic?q=educational+background+and+academic+coursework",
    headers=admin_headers
)
print(f"Status: {t1_resp.status_code}")
assert t1_resp.status_code == 200, f"Semantic search failed: {t1_resp.text}"
t1_data = t1_resp.json()
print(f"Response mode: {t1_data.get('mode')}")
print(f"Total results: {t1_data.get('total')}")
assert t1_data.get("status") == "success"
assert t1_data.get("mode") == "semantic"
assert t1_data.get("total") > 0, "Expected at least 1 semantic match"
first_doc = t1_data["results"][0]
print(f"Top result: '{first_doc['filename']}' | Similarity: {first_doc['similarity_score']}")
print(f"Snippet: '{first_doc.get('snippet', '')[:100]}...'")
assert first_doc.get("similarity_score") > 0.3
assert "document_id" in first_doc and "snippet" in first_doc and "metadata" in first_doc
test_results["Test 1 (Semantic natural-language query)"] = "PASSED"

# -------------------------------------------------------------
# Test 2: Semantic match without exact keyword match
# -------------------------------------------------------------
print("\n--- Test 2: Semantic Match Without Exact Keyword ---")
# Query concepts: employment history, job experience, candidate profile (none of which are exact keywords in filename)
t2_resp = requests.get(
    f"{BASE_URL}/api/search/semantic?q=candidate+employment+history+and+qualifications",
    headers=admin_headers
)
assert t2_resp.status_code == 200
t2_data = t2_resp.json()
print(f"Total results for concept query: {t2_data.get('total')}")
matched_filenames = [r["filename"] for r in t2_data.get("results", [])]
print(f"Matched documents: {matched_filenames}")
# Should match Resume_2.pdf or Academic_CV_Template
has_resume_or_cv = any("resume" in f.lower() or "cv" in f.lower() for f in matched_filenames)
print(f"Matched resume or CV semantically: {has_resume_or_cv}")
assert has_resume_or_cv, "Failed to match CV/Resume on semantic concept query!"
test_results["Test 2 (Semantic match without exact keyword)"] = "PASSED"

# -------------------------------------------------------------
# Test 3: Results ordered by descending semantic similarity
# -------------------------------------------------------------
print("\n--- Test 3: Results Ordered by Descending Semantic Similarity ---")
scores = [r["similarity_score"] for r in t1_data.get("results", [])]
print(f"Similarity scores: {scores}")
is_sorted = all(scores[i] >= scores[i + 1] for i in range(len(scores) - 1))
print(f"Scores strictly in descending order: {is_sorted}")
assert is_sorted, "Results not sorted descending by similarity_score!"
test_results["Test 3 (Descending similarity ordering)"] = "PASSED"

# -------------------------------------------------------------
# Test 4: Hybrid search returns relevant results and includes all 3 scores
# -------------------------------------------------------------
print("\n--- Test 4: Hybrid Search & All Three Scores ---")
t4_resp = requests.get(
    f"{BASE_URL}/api/search/hybrid?q=Resume",
    headers=admin_headers
)
assert t4_resp.status_code == 200, f"Hybrid search failed: {t4_resp.text}"
t4_data = t4_resp.json()
print(f"Hybrid Mode: {t4_data.get('mode')}")
print(f"Weights: {t4_data.get('weights')}")
print(f"Total Hybrid Results: {t4_data.get('total')}")
assert t4_data.get("mode") == "hybrid"
assert t4_data.get("total") > 0
top_hybrid = t4_data["results"][0]
print(f"Top result: '{top_hybrid['filename']}'")
print(f"  Combined score: {top_hybrid.get('combined_score')}")
print(f"  Keyword score:  {top_hybrid.get('keyword_score')}")
print(f"  Semantic score: {top_hybrid.get('semantic_score')}")
assert "combined_score" in top_hybrid
assert "keyword_score" in top_hybrid
assert "semantic_score" in top_hybrid
# Check sorting by combined score
hybrid_scores = [r["combined_score"] for r in t4_data.get("results", [])]
is_hybrid_sorted = all(hybrid_scores[i] >= hybrid_scores[i + 1] for i in range(len(hybrid_scores) - 1))
print(f"Hybrid results sorted descending by combined_score: {is_hybrid_sorted}")
assert is_hybrid_sorted
test_results["Test 4 (Hybrid search & 3 component scores)"] = "PASSED"

# -------------------------------------------------------------
# Test 5: Empty query returns HTTP 400
# -------------------------------------------------------------
print("\n--- Test 5: Empty Query Returns HTTP 400 ---")
sem_empty = requests.get(f"{BASE_URL}/api/search/semantic?q=", headers=admin_headers)
hyb_empty = requests.get(f"{BASE_URL}/api/search/hybrid?q=", headers=admin_headers)
print(f"Semantic empty query HTTP Status: {sem_empty.status_code}")
print(f"Hybrid empty query HTTP Status:   {hyb_empty.status_code}")
assert sem_empty.status_code == 400
assert hyb_empty.status_code == 400
test_results["Test 5 (Empty query returns HTTP 400)"] = "PASSED"

# -------------------------------------------------------------
# Test 6: Missing JWT returns HTTP 401
# -------------------------------------------------------------
print("\n--- Test 6: Missing JWT Returns HTTP 401 ---")
sem_no_jwt = requests.get(f"{BASE_URL}/api/search/semantic?q=developer")
hyb_no_jwt = requests.get(f"{BASE_URL}/api/search/hybrid?q=developer")
print(f"Semantic without JWT HTTP Status: {sem_no_jwt.status_code}")
print(f"Hybrid without JWT HTTP Status:   {hyb_no_jwt.status_code}")
assert sem_no_jwt.status_code == 401
assert hyb_no_jwt.status_code == 401
test_results["Test 6 (Missing JWT returns HTTP 401)"] = "PASSED"

# -------------------------------------------------------------
# Test 7 & 8: Division RBAC & Approved Cross-Division Access
# -------------------------------------------------------------
print("\n--- Test 7 & 8: Division RBAC & Approved Cross-Division Access ---")
with app.app_context():
    db = extensions.db
    # Find all approved requests for Finance user
    fin_user = db.users.find_one({"email": "finance.test@example.com"})
    assert fin_user is not None
    approved_reqs = list(db.access_requests.find({
        "requested_by": fin_user["_id"],
        "status": "approved"
    }))
    approved_doc_ids = [str(r["document_id"]) for r in approved_reqs if ObjectId.is_valid(r.get("document_id"))]
    print(f"Finance employee approved cross-division document IDs: {approved_doc_ids}")

    # Check unapproved cross-division documents
    unapproved_eng_docs = list(db.documents.find({
        "division_id": {"$ne": fin_user["division_id"]},
        "_id": {"$nin": [ObjectId(did) for did in approved_doc_ids]}
    }))
    unapproved_ids = [str(d["_id"]) for d in unapproved_eng_docs]
    print(f"Number of unapproved cross-division documents: {len(unapproved_ids)}")

# Run semantic search as Finance employee
fin_sem_resp = requests.get(
    f"{BASE_URL}/api/search/semantic?q=software+developer+resume",
    headers=fin_headers
)
assert fin_sem_resp.status_code == 200
fin_sem_data = fin_sem_resp.json()
fin_returned_ids = [r["document_id"] for r in fin_sem_data.get("results", [])]
print(f"Finance employee search returned doc IDs: {fin_returned_ids}")

# Verify Test 7: Unapproved Engineering docs NOT returned
leaked_docs = [did for did in fin_returned_ids if did in unapproved_ids]
print(f"Unapproved cross-division documents returned to Finance: {leaked_docs} (Expected: None)")
assert len(leaked_docs) == 0, f"Division isolation violated! Leaked documents: {leaked_docs}"
test_results["Test 7 (Engineering docs not exposed to Finance without approval)"] = "PASSED"

# Verify Test 8: Approved document IS returned
for app_id in approved_doc_ids:
    with app.app_context():
        app_doc = db.documents.find_one({"_id": ObjectId(app_id)})
        has_app_emb = bool(app_doc and app_doc.get("embedding"))
    if has_app_emb:
        print(f"Approved document {app_id} ('{app_doc.get('filename')}') returned in Finance search: {app_id in fin_returned_ids}")
        assert app_id in fin_returned_ids, f"Approved cross-division document {app_id} should be returned!"
test_results["Test 8 (Approved cross-division access behaves consistently)"] = "PASSED"

# -------------------------------------------------------------
# Test 9: Documents without embeddings do not crash searches
# -------------------------------------------------------------
print("\n--- Test 9: Documents Without Embeddings Do Not Crash Searches ---")
# Query words that match documents with or without embeddings
sem_test9 = requests.get(f"{BASE_URL}/api/search/semantic?q=metadata+test", headers=admin_headers)
hyb_test9 = requests.get(f"{BASE_URL}/api/search/hybrid?q=metadata+test", headers=admin_headers)
print(f"Semantic search status on non-embedded term: {sem_test9.status_code}")
print(f"Hybrid search status on non-embedded term:   {hyb_test9.status_code}")
assert sem_test9.status_code == 200
assert hyb_test9.status_code == 200
test_results["Test 9 (Documents without embeddings do not crash searches)"] = "PASSED"

# -------------------------------------------------------------
# Test 10: Existing keyword search still works unchanged
# -------------------------------------------------------------
print("\n--- Test 10: Existing Keyword Search Unchanged ---")
kw_resp = requests.get(f"{BASE_URL}/api/search?q=Resume", headers=admin_headers)
print(f"Existing GET /api/search?q=Resume HTTP Status: {kw_resp.status_code}")
assert kw_resp.status_code == 200
kw_data = kw_resp.json()
print(f"Keyword response status: {kw_data.get('status')}")
print(f"Keyword total results:   {kw_data.get('total_results')}")
assert kw_data.get("status") == "success"
assert "keyword" in kw_data and "total_results" in kw_data and "results" in kw_data
assert kw_data.get("total_results") > 0
test_results["Test 10 (Existing keyword search works unchanged)"] = "PASSED"

print("\n" + "=" * 70)
print("TEST SUMMARY RESULTS:")
print("=" * 70)
for test_name, result in test_results.items():
    print(f"  {test_name.ljust(60)}: {result}")

all_passed = all(r == "PASSED" for r in test_results.values())
print("=" * 70)
print(f"OVERALL RESULT: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
print("=" * 70)
assert all_passed
