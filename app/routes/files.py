
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.routes.auth import get_current_user
from app.services.document_parser import (
    extract_document_text,
    MAX_FILE_SIZE,
)
from app.services.file_analyzer import FileAnalyzer
from app.database import get_connection


router = APIRouter(prefix="/files", tags=["File Analysis"])

file_analyzer = FileAnalyzer()


@router.post("/analyze")
async def analyze_uploaded_file(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename required.")

        file_data = await file.read(MAX_FILE_SIZE + 1)

        if len(file_data) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="File exceeds the 10 MB size limit."
            )

        extracted_text = extract_document_text(
            file.filename,
            file_data
        )

        result = await file_analyzer.analyze_document(
            file.filename,
            extracted_text
        )

        extension = Path(file.filename).suffix.lower()

        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO uploaded_files (
                        user_id,
                        original_filename,
                        file_extension,
                        file_size,
                        extracted_characters,
                        analysis
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                    """,
                    (
                        current_user["id"],
                        file.filename,
                        extension,
                        len(file_data),
                        result["characters_analyzed"],
                        result["analysis"],
                    )
                )

                saved_record = cursor.fetchone()

        return {
            "success": True,
            "message": "Document analyzed and saved.",
            "file_id": saved_record[0],
            "filename": result["filename"],
            "characters_analyzed": result["characters_analyzed"],
            "analysis": result["analysis"],
            "created_at": saved_record[1].isoformat()
        }

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error))

    finally:
        await file.close()
