import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.embedding_service import embedding_service, MODEL_NAME, EMBEDDING_DIM

print("=" * 60)
print("TEST 1 & 2: VERIFYING SENTENCE TRANSFORMERS & EMBEDDING SERVICE")
print("=" * 60)

# Verify imports
import torch
import sentence_transformers
print(f"PyTorch Version: {torch.__version__}")
print(f"Sentence-Transformers Version: {sentence_transformers.__version__}")

sample_ocr_text = (
    "DocuSphere Intelligent Enterprise Document Management System. "
    "Quarterly financial audit report covering fiscal year 2024 compliance, "
    "internal accounting controls, balance sheet evaluations, and tax governance policies."
)

print(f"\nEncoding sample OCR text ({len(sample_ocr_text)} chars)...")
vector = embedding_service.generate_document_embedding(sample_ocr_text)

# Check 3: exactly 384 dimensions and finite
print(f"\nVector type: {type(vector)}")
print(f"Vector length: {len(vector)} (Expected: {EMBEDDING_DIM})")
is_dim_384 = len(vector) == EMBEDDING_DIM
all_finite = all(math.isfinite(x) for x in vector)
all_float = all(isinstance(x, float) for x in vector)
print(f"Has exactly 384 dimensions: {is_dim_384}")
print(f"All values are finite (no NaN/Inf): {all_finite}")
print(f"All values are Python floats: {all_float}")

# Check 4: normalized unit length (L2 norm ~ 1.0)
arr = np.array(vector, dtype=np.float32)
l2_norm = float(np.linalg.norm(arr))
print(f"\nL2 Norm of Vector: {l2_norm:.6f} (Expected: ~1.000000)")
is_unit_norm = abs(l2_norm - 1.0) < 1e-4
print(f"Is approximately unit length: {is_unit_norm}")

# Sample first 5 and last 5 elements
print(f"First 5 elements: {vector[:5]}")
print(f"Last 5 elements: {vector[-5:]}")

# Test query embedding and similarity
query_vec = embedding_service.generate_query_embedding("financial audit compliance")
sim = embedding_service.compute_similarity(query_vec, vector)
print(f"\nCosine similarity with query 'financial audit compliance': {sim:.4f}")

snippet = embedding_service.extract_semantic_snippet(sample_ocr_text, query_vec)
print(f"Extracted semantic snippet: '{snippet}'")

all_checks_passed = is_dim_384 and all_finite and all_float and is_unit_norm
print(f"\nVERIFICATION RESULT: {'PASSED' if all_checks_passed else 'FAILED'}")
if not all_checks_passed:
    sys.exit(1)
