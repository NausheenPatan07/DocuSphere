import sys
import os
import io
import math
import requests
import numpy as np
import pymupdf
from bson import ObjectId

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
import app.extensions as extensions

BASE_URL = "http://127.0.0.1:5000"

print("=" * 60)
print("TEST 9 & 10: VERIFYING UPLOAD PIPELINE, EMBEDDINGS & KEYWORD SEARCH")
print("=" * 60)

# Step 1: Login as Admin
print("\n[1] Logging in as Admin (nausheen.test@example.com)...")
res_admin = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "nausheen.test@example.com",
    "password": "DocuSphere@123"
})
assert res_admin.status_code == 200, f"Admin login failed: {res_admin.text}"
admin_token = res_admin.json()["access_token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}
print("    Admin login successful.")

# Step 2: Login as Finance Employee
print("\n[2] Logging in as Finance Employee (finance.test@example.com)...")
res_fin = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "finance.test@example.com",
    "password": "Finance@123"
})
assert res_fin.status_code == 200, f"Finance login failed: {res_fin.text}"
fin_token = res_fin.json()["access_token"]
fin_headers = {"Authorization": f"Bearer {fin_token}"}
print("    Finance Employee login successful.")

# Step 3: Create a real test PDF with selectable text
print("\n[3] Generating test PDF with OCR selectable text...")
doc = pymupdf.open()
page = doc.new_page()
test_text = (
    "DocuSphere Semantic Pipeline Verification Document.\n"
    "This document covers Quantum Cryptography and Post-Quantum Security Algorithms.\n"
    "Key concepts include lattice-based cryptographic primitives, key encapsulation, "
    "and quantum resistance standards established by NIST."
)
page.insert_text((50, 72), test_text, fontsize=12)
pdf_bytes = doc.tobytes()
doc.close()
print(f"    Generated PDF bytes: {len(pdf_bytes)} bytes.")

# Step 4: Upload PDF via POST /api/documents/upload
print("\n[4] Uploading test PDF as Admin to test upload + OCR + embedding pipeline...")
upload_files = {
    "file": ("quantum_crypto_eval.pdf", io.BytesIO(pdf_bytes), "application/pdf")
}
upload_data = {
    "metadata": '{"report_type": "Technical Report", "project_code": "QNT-404"}'
}
upload_res = requests.post(
    f"{BASE_URL}/api/documents/upload",
    headers=admin_headers,
    files=upload_files,
    data=upload_data
)
print(f"    Upload Status Code: {upload_res.status_code}")
assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
upload_json = upload_res.json()
new_doc_id = upload_json["document_id"]
print(f"    Uploaded Document ID: {new_doc_id}")
print(f"    OCR Status: {upload_json.get('ocr_status')}")
print(f"    Extracted Text Length: {upload_json.get('extracted_text_length')}")

# Step 5: Verify MongoDB Document Record for Embedding
print("\n[5] Inspecting MongoDB record for new document to verify embedding generation...")
app = create_app()
with app.app_context():
    db = extensions.db
    fs = extensions.fs

    mongo_doc = db.documents.find_one({"_id": ObjectId(new_doc_id)})
    assert mongo_doc is not None, "Document not found in MongoDB!"

    print(f"    Filename: {mongo_doc.get('filename')}")
    print(f"    OCR Status: {mongo_doc.get('ocr_status')}")
    print(f"    Extracted Text: '{mongo_doc.get('extracted_text')[:60]}...'")

    has_emb = "embedding" in mongo_doc and mongo_doc["embedding"] is not None
    print(f"    Has Embedding field: {has_emb}")
    assert has_emb, "Embedding field missing in newly uploaded document!"

    emb = mongo_doc["embedding"]
    dim = len(emb)
    print(f"    Embedding Dimensions: {dim} (Expected: 384)")
    assert dim == 384, f"Expected 384 dimensions, got {dim}"

    all_finite = all(math.isfinite(x) for x in emb)
    print(f"    All embedding values finite: {all_finite}")
    assert all_finite, "Embedding contains non-finite values!"

    norm = float(np.linalg.norm(np.array(emb, dtype=np.float32)))
    print(f"    L2 Norm: {norm:.6f} (Unit Length ~1.0: {abs(norm - 1.0) < 1e-4})")
    assert abs(norm - 1.0) < 1e-4, f"Vector not normalized: norm={norm}"

    print(f"    Embedding Model: {mongo_doc.get('embedding_model')}")
    assert mongo_doc.get("embedding_model") == "all-MiniLM-L6-v2"
    print("    -> TEST 9 (Upload + OCR + Embedding Pipeline): PASSED")

# Step 6: Test Existing Keyword Search
print("\n[6] Testing existing keyword search to confirm it remains 100% functional...")
search_res = requests.get(f"{BASE_URL}/api/search?q=Quantum", headers=admin_headers)
assert search_res.status_code == 200, f"Keyword search failed: {search_res.text}"
search_json = search_res.json()
print(f"    Admin Keyword Search for 'Quantum': Status={search_json.get('status')}, TotalResults={search_json.get('total_results')}")
found_in_results = any(r["document_id"] == new_doc_id for r in search_json.get("results", []))
print(f"    Found newly uploaded document in keyword search results: {found_in_results}")
assert found_in_results, "Uploaded document not found in keyword search!"

# Step 7: Test Division Isolation for Keyword Search
print("\n[7] Testing division-based RBAC on keyword search...")
# Admin uploaded to Engineering division. Finance employee should NOT see it.
fin_search_res = requests.get(f"{BASE_URL}/api/search?q=Quantum", headers=fin_headers)
assert fin_search_res.status_code == 200, f"Finance keyword search failed: {fin_search_res.text}"
fin_json = fin_search_res.json()
print(f"    Finance Employee Keyword Search for 'Quantum': TotalResults={fin_json.get('total_results')}")
fin_found = any(r["document_id"] == new_doc_id for r in fin_json.get("results", []))
print(f"    Engineering document visible to Finance employee: {fin_found} (Expected: False)")
assert not fin_found, "Division isolation violated! Finance employee saw Engineering document!"
print("    -> Division isolation RBAC verified successfully.")

# Step 8: Clean up test document
print("\n[8] Cleaning up uploaded test document...")
with app.app_context():
    gridfs_id = mongo_doc.get("gridfs_id")
    if gridfs_id:
        try:
            fs.delete(gridfs_id)
        except Exception:
            pass
    db.documents.delete_one({"_id": ObjectId(new_doc_id)})
    print(f"    Cleaned up test document {new_doc_id}.")

print("\n" + "=" * 60)
print("PHASE 1 VERIFICATION TESTS 9 & 10: ALL PASSED")
print("=" * 60)
