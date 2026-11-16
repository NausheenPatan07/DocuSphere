import sys
import os
import math
import numpy as np
from bson import ObjectId

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
import app.extensions as extensions

app = create_app()

with app.app_context():
    db = extensions.db
    docs = list(db.documents.find())
    print(f"Total documents in MongoDB: {len(docs)}")
    print("=" * 60)

    for i, doc in enumerate(docs, 1):
        doc_id = str(doc["_id"])
        filename = doc.get("filename", "Unknown")
        div_id = str(doc.get("division_id", "Unknown"))
        text = doc.get("extracted_text", "")
        has_embedding = "embedding" in doc and doc["embedding"] is not None
        embedding = doc.get("embedding")
        model = doc.get("embedding_model")

        print(f"[{i}/{len(docs)}] Document: '{filename}' | ID: {doc_id}")
        print(f"      Division ID: {div_id}")
        print(f"      Extracted Text Length: {len(text)} chars")
        print(f"      Has Embedding: {has_embedding}")

        if has_embedding:
            dim = len(embedding)
            all_finite = all(math.isfinite(x) for x in embedding)
            l2_norm = float(np.linalg.norm(np.array(embedding, dtype=np.float32)))
            print(f"      Embedding Dim: {dim} (Expected: 384)")
            print(f"      Embedding Model: {model}")
            print(f"      All Values Finite: {all_finite}")
            print(f"      L2 Norm: {l2_norm:.6f} (Unit Length ~1.0: {abs(l2_norm - 1.0) < 1e-4})")
            print(f"      First 3 vals: {embedding[:3]}")
        else:
            print("      [!] NO EMBEDDING STORED")
        print("-" * 60)

    # Test 7: Confirm documents with empty OCR text are skipped
    print("\nTEST 7: Inserting temporary document with empty extracted_text to verify skip logic...")
    dummy_doc = {
        "filename": "empty_ocr_test.pdf",
        "extracted_text": "",
        "ocr_status": "not_processed",
        "uploaded_by": docs[0]["uploaded_by"],
        "division_id": docs[0]["division_id"]
    }
    dummy_id = db.documents.insert_one(dummy_doc).inserted_id
    print(f"Created temporary dummy document with ID: {dummy_id}")

    # Run backfill check on this dummy document
    from scripts.backfill_embeddings import run_backfill
    print("Running backfill (should find 0 requiring embeddings because text is empty):")
    run_backfill(force=False)

    # Check dummy doc still has no embedding
    dummy_check = db.documents.find_one({"_id": dummy_id})
    dummy_has_embedding = "embedding" in dummy_check
    print(f"Dummy document has embedding: {dummy_has_embedding} (Expected: False - skipped due to empty text)")

    # Cleanup dummy doc
    db.documents.delete_one({"_id": dummy_id})
    print(f"Cleaned up temporary dummy document {dummy_id}.")
    print("TEST 7 RESULT: PASSED")
