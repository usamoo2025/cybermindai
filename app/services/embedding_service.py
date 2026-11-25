import httpx


OLLAMA_URL = "http://127.0.0.1:11434/api/embed"
EMBEDDING_MODEL = "nomic-embed-text"


def generate_embedding(text: str) -> list[float]:
    """
    Generate a 768-dimensional embedding using Ollama.
    """

    if not text or not text.strip():
        raise ValueError("Text cannot be empty.")

    payload = {
        "model": EMBEDDING_MODEL,
        "input": text
    }

    response = httpx.post(
        OLLAMA_URL,
        json=payload,
        timeout=120
    )

    response.raise_for_status()

    data = response.json()

    embedding = data["embeddings"][0]

    if len(embedding) != 768:
        raise ValueError(
            f"Expected 768 dimensions, got {len(embedding)}"
        )

    return embedding
