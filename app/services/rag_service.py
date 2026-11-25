
from app.database import get_connection
from app.services.chunking_service import split_text_into_chunks
from app.services.embedding_service import generate_embedding

from pgvector import Vector
from pgvector.psycopg import register_vector


# ==========================================
# INGEST DOCUMENT
# ==========================================

def ingest_document(uploaded_file_id: int, user_id: int) -> int:

    conn = get_connection()

    try:
        register_vector(conn)

        with conn.cursor() as cur:

            cur.execute(
                """
                SELECT extracted_text
                FROM uploaded_files
                WHERE id = %s AND user_id = %s
                """,
                (uploaded_file_id, user_id)
            )

            document = cur.fetchone()

            if document is None:
                raise ValueError("Document not found or access denied.")

            extracted_text = document[0]

            if not extracted_text or not extracted_text.strip():
                raise ValueError("Document contains no text.")

            chunks = split_text_into_chunks(extracted_text)

            if not chunks:
                raise ValueError("No chunks were generated.")

            cur.execute(
                """
                DELETE FROM document_chunks
                WHERE uploaded_file_id = %s
                  AND user_id = %s
                """,
                (uploaded_file_id, user_id)
            )

            for index, chunk in enumerate(chunks):

                embedding = generate_embedding(chunk)

                cur.execute(
                    """
                    INSERT INTO document_chunks (
                        uploaded_file_id,
                        user_id,
                        chunk_index,
                        chunk_text,
                        embedding
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        uploaded_file_id,
                        user_id,
                        index,
                        chunk,
                        Vector(embedding)
                    )
                )

        conn.commit()

        return len(chunks)

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


# ==========================================
# RETRIEVE RELEVANT CHUNKS
# ==========================================

def retrieve_relevant_chunks(
    query: str,
    user_id: int,
    limit: int = 5
) -> list[dict]:

    if not query or not query.strip():
        return []

    query_embedding = generate_embedding(query)

    conn = get_connection()

    try:
        register_vector(conn)

        with conn.cursor() as cur:

            cur.execute(
                """
                SELECT
                    dc.chunk_text,
                    dc.uploaded_file_id,
                    dc.chunk_index,
                    uf.original_filename,
                    dc.embedding <=> %s AS distance

                FROM document_chunks dc

                JOIN uploaded_files uf
                    ON uf.id = dc.uploaded_file_id

                WHERE dc.user_id = %s
                  AND dc.embedding IS NOT NULL

                ORDER BY dc.embedding <=> %s

                LIMIT %s
                """,
                (
                    Vector(query_embedding),
                    user_id,
                    Vector(query_embedding),
                    limit
                )
            )

            rows = cur.fetchall()

        return [
            {
                "text": row[0],
                "file_id": row[1],
                "chunk_index": row[2],
                "filename": row[3],
                "distance": float(row[4])
            }
            for row in rows
        ]

    finally:
        conn.close()
