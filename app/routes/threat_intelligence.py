from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.routes.auth import get_current_user
from app.services.threat_intelligence import (
    ThreatIntelligenceAnalyzer
)
from app.services.threat_report import ThreatReportFormatter

router = APIRouter(
    prefix="/threat-intelligence",
    tags=["Threat Intelligence"]
)

analyzer = ThreatIntelligenceAnalyzer()


class IndicatorRequest(BaseModel):

    indicator: str = Field(
        min_length=1,
        max_length=100
    )


@router.post("/analyze")
def analyze_indicator(
    request: IndicatorRequest,
    current_user=Depends(get_current_user)
):

    result = analyzer.analyze(request.indicator)

    if not result.get("success"):
        return result

    result["report"] = ThreatReportFormatter.format_report(result)

    return result