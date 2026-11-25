import hashlib
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.routes.auth import get_current_user
from app.services.document_parser import (
    extract_document_text,
    MAX_FILE_SIZE,
)
from app.services.file_analyzer import FileAnalyzer
from app.services.rag_service import ingest_document
from app.database import get_connection


router = APIRouter(prefix="/files", tags=["File Analysis"])

file_analyzer = FileAnalyzer()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


# ==========================================
# 1. ANALYZE, SAVE AND INDEX DOCUMENT
# ==========================================

@router.post("/analyze")
async def analyze_uploaded_file(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    storage_path = None
    file_id = None

    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename required.")

        file_data = await file.read(MAX_FILE_SIZE + 1)

        if len(file_data) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="File exceeds the 10 MB size limit."
            )

        extracted_text = extract_document_text(file.filename, file_data)

        result = await file_analyzer.analyze_document(
            file.filename,
            extracted_text
        )

        stored_filename = uuid.uuid4().hex
        storage_path = UPLOAD_DIR / stored_filename

        storage_path.write_bytes(file_data)

        sha256_hash = hashlib.sha256(file_data).hexdigest()

        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO uploaded_files (
                        user_id,
                        original_filename,
                        storage_key,
                        content_type,
                        file_size,
                        sha256_hash,
                        extracted_text,
                        analysis_status,
                        created_at
                    )
                    VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, CURRENT_TIMESTAMP
                    )
                    RETURNING id, created_at
                    """,
                    (
                        current_user["id"],
                        file.filename,
                        str(storage_path),
                        file.content_type,
                        len(file_data),
                        sha256_hash,
                        extracted_text,
                        "completed",
                    )
                )

                saved_record = cursor.fetchone()

        file_id = saved_record[0]

        chunk_count = ingest_document(
            uploaded_file_id=file_id,
            user_id=current_user["id"]
        )

        return {
            "success": True,
            "message": "Document analyzed and indexed successfully.",
            "file_id": file_id,
            "filename": result["filename"],
            "characters_analyzed": result["characters_analyzed"],
            "chunks_created": chunk_count,
            "analysis": result["analysis"],
            "created_at": saved_record[1].isoformat()
        }

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error))

    except Exception as error:
        # Clean up the file if document processing fails
        if storage_path and storage_path.exists():
            storage_path.unlink(missing_ok=True)

        # If the DB record was already saved, remove it too
        if file_id is not None:
            try:
                with get_connection() as connection:
                    with connection.cursor() as cursor:
                        cursor.execute(
                            """
                            DELETE FROM uploaded_files
                            WHERE id = %s AND user_id = %s
                            """,
                            (file_id, current_user["id"])
                        )
            except Exception:
                pass

        raise HTTPException(
            status_code=500,
            detail=f"Document processing failed: {str(error)}"
        )

    finally:
        await file.close()


# ==========================================
# 2. LIST USER'S KNOWLEDGE BASE DOCUMENTS
# ==========================================

@router.get("/knowledge-base")
async def list_knowledge_base(
    current_user=Depends(get_current_user)
):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    f.id,
                    f.original_filename,
                    f.content_type,
                    f.file_size,
                    f.analysis_status,
                    f.created_at,
                    COUNT(c.id) AS chunk_count
                FROM uploaded_files f
                LEFT JOIN document_chunks c
                    ON c.uploaded_file_id = f.id
                WHERE f.user_id = %s
                GROUP BY f.id
                ORDER BY f.created_at DESC
                """,
                (current_user["id"],)
            )

            rows = cursor.fetchall()

    documents = []

    for row in rows:
        documents.append({
            "id": row[0],
            "filename": row[1],
            "content_type": row[2],
            "file_size": row[3],
            "status": row[4],
            "created_at": row[5].isoformat() if row[5] else None,
            "chunks": row[6],
        })

    return {
        "success": True,
        "total": len(documents),
        "documents": documents
    }


# ==========================================
# 3. DELETE KNOWLEDGE BASE DOCUMENT
# ==========================================

@router.delete("/knowledge-base/{file_id}")
async def delete_knowledge_base_document(
    file_id: int,
    current_user=Depends(get_current_user)
):
    storage_key = None

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT storage_key
                FROM uploaded_files
                WHERE id = %s AND user_id = %s
                """,
                (file_id, current_user["id"])
            )

            record = cursor.fetchone()

            if not record:
                raise HTTPException(
                    status_code=404,
                    detail="Document not found."
                )

            storage_key = record[0]

            cursor.execute(
                """
                DELETE FROM uploaded_files
                WHERE id = %s AND user_id = %s
                """,
                (file_id, current_user["id"])
            )

    # Remove stored file, if present, using a path restricted to uploads
    if storage_key:
        try:
            stored_path = Path(storage_key).resolve()
            uploads_root = UPLOAD_DIR.resolve()

            if stored_path.parent == uploads_root:
                stored_path.unlink(missing_ok=True)

        except OSError:
            pass

    return {
        "success": True,
        "message": "Document deleted successfully.",
        "file_id": file_id
    }