
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.routes.auth import get_current_user
from app.services.image_analyzer import (
    ImageAnalyzer,
    MAX_IMAGE_SIZE
)


router = APIRouter(
    prefix="/image",
    tags=["Image Security Analysis"]
)

image_analyzer = ImageAnalyzer()


# ==========================================
# IMAGE SECURITY ANALYSIS
# ==========================================

@router.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required."
        )

    try:

        # Read only up to the allowed limit plus one byte.

        image_bytes = await file.read(
            MAX_IMAGE_SIZE + 1
        )

        if len(image_bytes) > MAX_IMAGE_SIZE:

            raise HTTPException(
                status_code=413,
                detail="Image exceeds the 10 MB limit."
            )

        if not image_bytes:

            raise HTTPException(
                status_code=400,
                detail="Uploaded image is empty."
            )

        # Analyze the uploaded image.

        result = image_analyzer.analyze(
            image_bytes
        )

        result["filename"] = file.filename

        return {
            "message": "Image analysis completed.",
            "analysis": result
        }

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except HTTPException:

        raise

    except Exception as error:

        print(f"Image analysis error: {error}")

        raise HTTPException(
            status_code=500,
            detail="Could not analyze the image."
        )

    finally:

        await file.close()
