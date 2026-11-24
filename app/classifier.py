
from pathlib import Path
import joblib


# ==========================================
# 1. FIND THE TRAINED MODEL
# ==========================================

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = (
    BASE_DIR
    / "models"
    / "cybermind_classifier.joblib"
)


# ==========================================
# 2. LOAD THE TRAINED MODEL
# ==========================================

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Trained model not found: {MODEL_PATH}. "
        "Run python train_model.py first."
    )

model = joblib.load(MODEL_PATH)


# ==========================================
# 3. CREATE CLASSIFICATION FUNCTION
# ==========================================

def classify_event(description: str):

    if not isinstance(description, str) or not description.strip():
        raise ValueError("Description must be a non-empty string.")

    prediction = model.predict([description])

    return str(prediction[0])


# ==========================================
# 4. GET PREDICTION CONFIDENCE
# ==========================================

def classify_event_with_confidence(description: str):

    if not isinstance(description, str) or not description.strip():
        raise ValueError("Description must be a non-empty string.")

    prediction = model.predict([description])[0]

    probabilities = model.predict_proba([description])[0]

    confidence = max(probabilities)

    return {
        "prediction": str(prediction),
        "confidence": round(float(confidence), 4)
    }
