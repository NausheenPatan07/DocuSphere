"""
Backfill utility script to compute and store 384-dimensional SentenceTransformer
('all-MiniLM-L6-v2') embeddings for all existing documents in DocuSphere MongoDB.
"""

import sys
import os
import time
from datetime import datetime, timezone

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
import app.extensions as extensions
from app.services.embedding_service import embedding_service, MODEL_NAME


def run_backfill(force=False):
    app = create_app()

    with app.app_context():
        db = extensions.db
        print("=" * 60)
        print("DocuSphere AI Semantic Search - Document Embeddings Backfill")
        print(f"Model: {MODEL_NAME} (384-dimensional)")
        print(f"Force recompute: {force}")
        print("=" * 60)

        # Build query
        query = {
            "extracted_text": {"$exists": True, "$ne": ""}
        }
        if not force:
            query["embedding"] = {"$exists": False}

        total_matching = db.documents.count_documents(query)
        print(f"Found {total_matching} document(s) requiring embeddings.\n")

        if total_matching == 0:
            print("All documents already have embeddings. Nothing to do.")
            return

        cursor = db.documents.find(query)
        processed = 0
        skipped = 0
        failed = 0
        start_time = time.time()

        for doc in cursor:
            doc_id = doc["_id"]
            filename = doc.get("filename", "Unknown")
            extracted_text = doc.get("extracted_text", "")

            if not extracted_text or not extracted_text.strip():
                print(f"[-] Doc {doc_id} ('{filename}'): No extracted text. Skipping.")
                skipped += 1
                continue

            try:
                t0 = time.time()
                embedding = embedding_service.generate_document_embedding(extracted_text)

                if not embedding or len(embedding) != 384:
                    print(f"[!] Doc {doc_id} ('{filename}'): Generated invalid embedding. Skipping.")
                    failed += 1
                    continue

                db.documents.update_one(
                    {"_id": doc_id},
                    {
                        "$set": {
                            "embedding": embedding,
                            "embedding_model": MODEL_NAME,
                            "embedding_dim": len(embedding),
                            "embedding_updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                dt = (time.time() - t0) * 1000
                processed += 1
                print(f"[+] [{processed}/{total_matching}] Doc {doc_id} ('{filename}'): Embedding generated & saved ({dt:.1f}ms)")

            except Exception as e:
                failed += 1
                print(f"[x] Doc {doc_id} ('{filename}'): Error generating embedding: {e}")

        total_time = time.time() - start_time
        print("\n" + "=" * 60)
        print("Backfill Complete Summary:")
        print(f"  Total Processed Successfully: {processed}")
        print(f"  Skipped (No text):            {skipped}")
        print(f"  Failed:                       {failed}")
        print(f"  Total Elapsed Time:           {total_time:.2f}s")
        print("=" * 60)


if __name__ == "__main__":
    force_run = "--force" in sys.argv
    run_backfill(force=force_run)
