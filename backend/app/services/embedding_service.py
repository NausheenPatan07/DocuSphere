import logging
import re
import numpy as np

logger = logging.getLogger(__name__)

# Model specification
MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
MAX_CHUNK_CHARS = 1000
CHUNK_OVERLAP = 200


class EmbeddingService:
    """
    Singleton service managing Sentence Transformers ('all-MiniLM-L6-v2')
    embeddings, chunking, and cosine similarity calculations.
    """

    _instance = None
    _model = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = EmbeddingService()
        return cls._instance

    def _load_model(self):
        """Lazy load model on first usage."""
        if self._model is None:
            logger.info("Loading SentenceTransformer model '%s'...", MODEL_NAME)
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(MODEL_NAME)
            logger.info("SentenceTransformer model '%s' loaded successfully.", MODEL_NAME)
        return self._model

    def is_loaded(self):
        return self._model is not None

    def chunk_text(self, text, max_chars=MAX_CHUNK_CHARS, overlap=CHUNK_OVERLAP):
        """
        Split long text into overlapping chunks to capture semantic context
        across long documents exceeding token limits.
        """
        if not text:
            return []

        cleaned = re.sub(r"\s+", " ", text).strip()
        if len(cleaned) <= max_chars:
            return [cleaned]

        chunks = []
        start = 0
        text_len = len(cleaned)

        while start < text_len:
            end = start + max_chars
            if end >= text_len:
                chunks.append(cleaned[start:])
                break

            # Find nearest space or sentence boundary before 'end'
            boundary = cleaned.rfind(" ", start, end)
            if boundary == -1 or boundary <= start:
                boundary = end

            chunks.append(cleaned[start:boundary].strip())
            start = max(start + 1, boundary - overlap)

        return [c for c in chunks if len(c.strip()) > 10]

    def generate_document_embedding(self, text):
        """
        Generate a normalized 384-dimensional embedding for a document.
        For multi-chunk documents, computes the mean of chunk embeddings
        and normalizes the result.
        Returns a Python list of standard floats.
        """
        if not text or not text.strip():
            return None

        model = self._load_model()
        chunks = self.chunk_text(text)

        if not chunks:
            return None

        # Generate chunk embeddings (already L2 normalized by model.encode)
        chunk_embeddings = model.encode(
            chunks,
            normalize_embeddings=True,
            show_progress_bar=False,
            convert_to_numpy=True
        )

        if len(chunk_embeddings) == 1:
            doc_vector = chunk_embeddings[0]
        else:
            # Mean pooling across chunks
            mean_vec = np.mean(chunk_embeddings, axis=0)
            norm = np.linalg.norm(mean_vec)
            if norm > 0:
                doc_vector = mean_vec / norm
            else:
                doc_vector = mean_vec

        return [float(x) for x in doc_vector]

    def generate_query_embedding(self, query):
        """
        Generate a normalized 384-dimensional embedding for a search query.
        Returns a 1D numpy array of float32.
        """
        if not query or not query.strip():
            return None

        model = self._load_model()
        query_vector = model.encode(
            query.strip(),
            normalize_embeddings=True,
            show_progress_bar=False,
            convert_to_numpy=True
        )
        return query_vector.astype(np.float32)

    def compute_similarity(self, query_vector, doc_vector):
        """
        Compute cosine similarity between two normalized vectors.
        Since both are unit-normalized (L2 norm = 1), cosine similarity is dot product.
        """
        if query_vector is None or doc_vector is None:
            return 0.0

        u = np.asarray(query_vector, dtype=np.float32)
        v = np.asarray(doc_vector, dtype=np.float32)

        # Dot product of normalized vectors
        similarity = float(np.dot(u, v))
        return max(0.0, min(1.0, similarity))

    def extract_semantic_snippet(self, text, query_vector, max_chars=240):
        """
        Identify and extract the sentence or paragraph in the document
        with the highest semantic similarity to the query vector.
        """
        if not text or query_vector is None:
            return ""

        # Break text into candidate sentences/segments
        sentences = re.split(r"(?<=[.!?\n])\s+", text)
        candidates = [s.strip() for s in sentences if len(s.strip()) >= 20]

        if not candidates:
            # Fallback to leading characters
            cleaned = re.sub(r"\s+", " ", text).strip()
            return (cleaned[:max_chars] + "...") if len(cleaned) > max_chars else cleaned

        model = self._load_model()

        # Batch encode candidates
        candidate_embeddings = model.encode(
            candidates,
            normalize_embeddings=True,
            show_progress_bar=False,
            convert_to_numpy=True
        )

        # Compute dot product similarities
        scores = np.dot(candidate_embeddings, query_vector)
        best_idx = int(np.argmax(scores))
        best_sentence = candidates[best_idx]

        # Add brief surrounding context if available
        prefix = ""
        suffix = ""
        if best_idx > 0:
            prefix = "..." + candidates[best_idx - 1][-50:].strip() + " "
        if best_idx < len(candidates) - 1:
            suffix = " " + candidates[best_idx + 1][:50].strip() + "..."

        snippet = f"{prefix}{best_sentence}{suffix}".strip()
        if len(snippet) > max_chars + 80:
            snippet = snippet[:max_chars] + "..."

        return snippet


# Module-level convenience functions
embedding_service = EmbeddingService.get_instance()
