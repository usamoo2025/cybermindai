
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.routes.auth import get_current_user
from app.services.url_analyzer import URLAnalyzer


router = APIRouter(
    prefix="/url",
    tags=["Phishing URL Analysis"]
)

url_analyzer = URLAnalyzer()


class URLAnalysisRequest(BaseModel):

    url: str = Field(
        min_length=1,
        max_length=2048
    )


# ==========================================
# PHISHING URL ANALYSIS
# ==========================================

@router.post("/analyze")
async def analyze_url(
    request: URLAnalysisRequest,
    current_user=Depends(get_current_user)
):

    try:

        result = await url_analyzer.analyze(
            request.url
        )

        return {
            "message": "URL analysis completed.",
            "analysis": result
        }

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

        print(f"URL analysis error: {error}")

        raise HTTPException(
            status_code=500,
            detail="Could not analyze the URL."
        )
