
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.routes.auth import get_current_user
from app.services.email_analyzer import EmailAnalyzer


router = APIRouter(
    prefix="/email",
    tags=["Email Security Analysis"]
)

email_analyzer = EmailAnalyzer()


class EmailAnalysisRequest(BaseModel):

    sender: str = Field(
        default="",
        max_length=500
    )

    subject: str = Field(
        default="",
        max_length=1000
    )

    email_text: str = Field(
        min_length=1,
        max_length=20000
    )


# ==========================================
# EMAIL SECURITY ANALYSIS
# ==========================================

@router.post("/analyze")
async def analyze_email(
    request: EmailAnalysisRequest,
    current_user=Depends(get_current_user)
):

    try:

        result = await email_analyzer.analyze(
            sender=request.sender,
            subject=request.subject,
            email_text=request.email_text
        )

        return {
            "message": "Email security analysis completed.",
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

        print(f"Email analysis error: {error}")

        raise HTTPException(
            status_code=500,
            detail="Could not analyze the email."
        )
