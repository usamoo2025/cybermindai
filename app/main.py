
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.routes.files import router as files_router
from app.database import get_connection
from app.classifier import classify_event_with_confidence
from app.ai.analyzer import CyberMindAnalyzer
from app.routes.auth import router as auth_router, get_current_user
from app.routes.chat import router as chat_router
from app.routes.image_analysis import router as image_router
from app.routes.file_security import router as file_security_router
from app.routes.url_analysis import router as url_router
from app.routes.email_analysis import router as email_router
from app.routes.threat_intelligence import router as threat_intelligence_router

# ==========================================
# 1. CREATE FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="CyberMind AI",
    description="Local Cybersecurity Intelligence Assistant",
    version="1.0.0"
)

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR / "static"),
    name="static"
)

app.include_router(auth_router)
app.include_router(files_router)
app.include_router(chat_router)
app.include_router(image_router)
app.include_router(file_security_router)
app.include_router(url_router)
app.include_router(email_router)
app.include_router(threat_intelligence_router)

# Initialize the local AI analyzer
analyzer = CyberMindAnalyzer()


# ==========================================
# 2. REQUEST DATA VALIDATION
# ==========================================

class SecurityLogCreate(BaseModel):
    event_type: str
    description: str
    severity: str


class AIAnalysisRequest(BaseModel):
    description: str = Field(
        min_length=1,
        max_length=5000
    )


# ==========================================
# 3. FRONTEND PAGES
# ==========================================

@app.get("/")
def home():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/dashboard")
def dashboard():
    return FileResponse(FRONTEND_DIR / "dashboard.html")


@app.get("/signup")
def signup_page():
    return FileResponse(FRONTEND_DIR / "signup.html")


@app.get("/login")
def login_page():
    return FileResponse(FRONTEND_DIR / "login.html")




# ==========================================
# 4. HEALTH CHECK
# ==========================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "CyberMind AI",
        "version": "1.0.0"
    }


# ==========================================
# 5. AI SECURITY ANALYSIS
# ==========================================

@app.post("/ai/analyze")
async def analyze_security_event(
    request: AIAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):

    try:
        result = await analyzer.analyze(
            request.description
        )

        return {
            "message": "Security analysis completed",
            "analysis": result
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except RuntimeError:
        raise HTTPException(
            status_code=502,
            detail="Local AI analysis failed. Check whether Ollama is running."
        )


# ==========================================
# 6. CREATE SECURITY LOG
# ==========================================

@app.post("/logs", status_code=201)
def create_security_log(
    log: SecurityLogCreate,
    current_user: dict = Depends(get_current_user)
):

    classification = classify_event_with_confidence(
        log.description
    )

    predicted_category = classification["prediction"]
    confidence = classification["confidence"]

    connection = get_connection()

    try:
        with connection.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO security_logs
                (
                    event_type,
                    description,
                    severity,
                    predicted_category,
                    confidence,
                    user_id
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    log.event_type,
                    log.description,
                    log.severity,
                    predicted_category,
                    confidence,
                    current_user["id"]
                )
            )

            new_id = cursor.fetchone()[0]

        connection.commit()

        return {
            "message": "Security log created successfully",
            "id": new_id,
            "log": log.model_dump(),
            "ai_analysis": {
                "prediction": predicted_category,
                "confidence": confidence
            }
        }

    except Exception:
        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not save security log"
        )

    finally:
        connection.close()


# ==========================================
# 7. RETRIEVE SECURITY LOGS
# ==========================================

@app.get("/logs")
def get_security_logs(
    current_user: dict = Depends(get_current_user)
):

    connection = get_connection()

    try:
        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    event_type,
                    description,
                    severity,
                    created_at,
                    predicted_category,
                    confidence
                FROM security_logs
                WHERE user_id = %s
                ORDER BY id DESC
                """,
                (current_user["id"],)
            )

            logs = cursor.fetchall()

        return {
            "total_logs": len(logs),
            "logs": [
                {
                    "id": log[0],
                    "event_type": log[1],
                    "description": log[2],
                    "severity": log[3],
                    "created_at": log[4],
                    "predicted_category": log[5],
                    "confidence": (
                        float(log[6])
                        if log[6] is not None
                        else None
                    )
                }
                for log in logs
            ]
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve security logs"
        )

    finally:
        connection.close()
