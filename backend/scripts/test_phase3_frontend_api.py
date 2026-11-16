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
print("DOCUSPHERE PHASE 3: FRONTEND API INTEGRATION TEST SUITE")
print("=" * 70)

# Setup Auth
admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "nausheen.test@example.com",
    "password": "DocuSphere@123"
})
assert admin_resp.status_code == 200
admin_token = admin_resp.json()["access_token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}

fin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "finance.test@example.com",
    "password": "Finance@123"
})
assert fin_resp.status_code == 200
fin_token = fin_resp.json()["access_token"]
fin_headers = {"Authorization": f"Bearer {fin_token}"}

app = create_app()
with app.app_context():
    db = extensions.db
    fin_user = db.users.find_one({"email": "finance.test@example.com"})
    approved_reqs = list(db.access_requests.find({"requested_by": fin_user["_id"], "status": "approved"}))
    approved_ids = [str(r["document_id"]) for r in approved_reqs]
    unapproved_eng = [
        str(d["_id"]) for d in db.documents.find({
            "division_id": {"$ne": fin_user["division_id"]},
            "_id": {"$nin": [ObjectId(i) for i in approved_ids]}
        })
    ]

# 1. Keyword search verification
print("\n[1] Verifying Keyword Search (GET /api/search?q=Resume)...")
kw_res = requests.get(f"{BASE_URL}/api/search?q=Resume", headers=admin_headers)
assert kw_res.status_code == 200
kw_json = kw_res.json()
print(f"    Status: {kw_json.get('status')}, Total Results: {kw_json.get('total_results')}")
assert kw_json.get("status") == "success"
assert len(kw_json.get("results", [])) > 0
print("    -> Keyword search verified.")

# 2. Semantic AI search verification
print("\n[2] Verifying Semantic AI Search (GET /api/search/semantic?q=academic+background)...")
sem_res = requests.get(f"{BASE_URL}/api/search/semantic?q=academic+background", headers=admin_headers)
assert sem_res.status_code == 200
sem_json = sem_res.json()
print(f"    Status: {sem_json.get('status')}, Mode: {sem_json.get('mode')}, Total: {sem_json.get('total')}")
assert sem_json.get("status") == "success"
assert sem_json.get("mode") == "semantic"
assert len(sem_json.get("results", [])) > 0
top_sem = sem_json["results"][0]
print(f"    Top Document: {top_sem.get('filename')}")
print(f"    Similarity Score: {top_sem.get('similarity_score')}")
print(f"    Snippet: {top_sem.get('snippet')[:80]}...")
assert "similarity_score" in top_sem
assert isinstance(top_sem["similarity_score"], float)
print("    -> Semantic AI search verified.")

# 3. Hybrid search verification
print("\n[3] Verifying Hybrid Search (GET /api/search/hybrid?q=Resume)...")
hyb_res = requests.get(f"{BASE_URL}/api/search/hybrid?q=Resume", headers=admin_headers)
assert hyb_res.status_code == 200
hyb_json = hyb_res.json()
print(f"    Status: {hyb_json.get('status')}, Mode: {hyb_json.get('mode')}, Total: {hyb_json.get('total')}")
assert hyb_json.get("mode") == "hybrid"
top_hyb = hyb_json["results"][0]
print(f"    Top Document: {top_hyb.get('filename')}")
print(f"    Combined Score: {top_hyb.get('combined_score')}")
print(f"    Semantic Score: {top_hyb.get('semantic_score')}")
print(f"    Keyword Score:  {top_hyb.get('keyword_score')}")
assert "combined_score" in top_hyb and "semantic_score" in top_hyb and "keyword_score" in top_hyb
print("    -> Hybrid search verified.")

# 4. Natural-language query without exact keywords
print("\n[4] Verifying Natural Language Query (GET /api/search/semantic?q=student+leadership+and+mentorship)...")
nl_res = requests.get(f"{BASE_URL}/api/search/semantic?q=student+leadership+and+mentorship", headers=admin_headers)
assert nl_res.status_code == 200
nl_json = nl_res.json()
assert nl_json.get("total") > 0
print(f"    Total: {nl_json.get('total')}, Top Result: {nl_json['results'][0]['filename']}")
print("    -> Natural-language search verified.")

# 5. Empty query handling
print("\n[5] Verifying Empty Query Handling...")
e1 = requests.get(f"{BASE_URL}/api/search?q=", headers=admin_headers)
e2 = requests.get(f"{BASE_URL}/api/search/semantic?q=", headers=admin_headers)
e3 = requests.get(f"{BASE_URL}/api/search/hybrid?q=", headers=admin_headers)
print(f"    Keyword empty status: {e1.status_code}")
print(f"    Semantic empty status: {e2.status_code}")
print(f"    Hybrid empty status: {e3.status_code}")
assert e1.status_code == 400
assert e2.status_code == 400
assert e3.status_code == 400
print("    -> Empty queries correctly return HTTP 400.")

# 6. Finance users cannot see unauthorized Engineering documents
print("\n[6] Verifying Division Isolation for Finance user across all modes...")
for mode, endpoint in [("keyword", "/api/search"), ("semantic", "/api/search/semantic"), ("hybrid", "/api/search/hybrid")]:
    res = requests.get(f"{BASE_URL}{endpoint}?q=Resume", headers=fin_headers)
    assert res.status_code == 200
    returned_ids = [r["document_id"] for r in res.json().get("results", [])]
    leaked = [did for did in returned_ids if did in unapproved_eng]
    print(f"    Mode '{mode}': Returned {len(returned_ids)} docs. Leaked unapproved docs: {leaked}")
    assert len(leaked) == 0, f"Leaked unapproved documents in {mode}: {leaked}"
print("    -> Division RBAC strictly enforced across all 3 modes.")

# 7. Approved cross-division access remains consistent
print("\n[7] Verifying Approved Cross-Division Access for Finance user...")
fin_sem = requests.get(f"{BASE_URL}/api/search/semantic?q=software+developer+resume", headers=fin_headers)
assert fin_sem.status_code == 200
fin_ids = [r["document_id"] for r in fin_sem.json().get("results", [])]
print(f"    Finance user semantic search returned IDs: {fin_ids}")
# Confirm at least one approved ID is returned
has_approved = any(aid in fin_ids for aid in approved_ids)
print(f"    Contains approved cross-division document: {has_approved}")
assert has_approved, "Approved cross-division document was not returned!"
print("    -> Approved cross-division access functioning consistently.")

# 8. Document details and authorized download
print("\n[8] Verifying Document Details & Download...")
test_doc_id = top_sem["document_id"]
detail_res = requests.get(f"{BASE_URL}/api/documents/", headers=admin_headers)
assert detail_res.status_code == 200
dl_res = requests.get(f"{BASE_URL}/api/documents/{test_doc_id}/download", headers=admin_headers)
print(f"    Admin download status for {test_doc_id}: {dl_res.status_code}")
assert dl_res.status_code == 200
assert len(dl_res.content) > 0

# Finance download on unapproved document should return 403
if unapproved_eng:
    unapproved_id = unapproved_eng[0]
    unauth_dl = requests.get(f"{BASE_URL}/api/documents/{unapproved_id}/download", headers=fin_headers)
    print(f"    Finance unauthorized download status: {unauth_dl.status_code} (Expected: 403)")
    assert unauth_dl.status_code == 403

print("    -> Document details and authorized downloads verified.")

print("\n" + "=" * 70)
print("PHASE 3 ALL FRONTEND API INTEGRATION CHECKS PASSED")
print("=" * 70)
