from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile
)

from app.routes.auth import get_current_user
from app.services.file_security_analyzer import (
    FileSecurityAnalyzer
)
from app.services.document_parser import MAX_FILE_SIZE


router = APIRouter(
    prefix="/file-security",
    tags=["File Security Analysis"]
)

security_analyzer = FileSecurityAnalyzer()


# ==========================================
# FILE SECURITY ANALYSIS
# ==========================================

@router.post("/analyze")
async def analyze_file_security(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):

    try:

        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="Filename is required."
            )

        # Read within the file size limit.
        file_data = await file.read(
            MAX_FILE_SIZE + 1
        )

        if len(file_data) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="File exceeds the 10 MB limit."
            )

        if not file_data:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty."
            )

        # Run the independent security analysis.
        result = await security_analyzer.analyze(
            file.filename,
            file_data
        )

        return {
            "message": "File security analysis completed.",
            "report": result
        }

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except RuntimeError:
        raise HTTPException(
            status_code=503,
            detail="Local AI analysis failed. Check Ollama."
        )

    except Exception as error:

        print(f"File security analysis error: {error}")

        raise HTTPException(
            status_code=500,
            detail="Could not analyze the uploaded file."
        )

    finally:
        await file.close()
