
from pathlib import Path

import joblib

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score


# ==========================================
# 1. PROJECT PATHS
# ==========================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_DIR = BASE_DIR / "models"
MODEL_PATH = MODEL_DIR / "cybermind_classifier.joblib"


# ==========================================
# 2. TRAINING DATA
# ==========================================

training_data = [
    # Phishing examples
    ("Urgent! Verify your account password immediately", "phishing"),
    ("Your bank account is suspended, click this link", "phishing"),
    ("You won a prize, enter your details now", "phishing"),
    ("Confirm your login credentials to avoid account closure", "phishing"),
    ("Unusual activity detected, verify your account", "phishing"),
    ("Update your payment information using this link", "phishing"),
    ("Your account requires immediate verification", "phishing"),
    ("Click here to claim your free reward", "phishing"),
    ("Your password will expire, sign in immediately", "phishing"),
    ("Confirm your identity through this suspicious link", "phishing"),

    # Suspicious login examples
    ("Multiple failed login attempts detected", "suspicious_login"),
    ("Login attempt from an unfamiliar IP address", "suspicious_login"),
    ("Several authentication failures in one minute", "suspicious_login"),
    ("Repeated password failures on administrator account", "suspicious_login"),
    ("Login detected from an unusual location", "suspicious_login"),
    ("Unexpected administrator login activity", "suspicious_login"),
    ("Multiple login attempts against user account", "suspicious_login"),
    ("Authentication failures detected on server", "suspicious_login"),
    ("New device login requires security review", "suspicious_login"),
    ("Unusual login activity detected overnight", "suspicious_login"),

    # Benign examples
    ("User logged in successfully", "benign"),
    ("Daily system backup completed successfully", "benign"),
    ("Application started normally", "benign"),
    ("User updated their profile information", "benign"),
    ("Scheduled maintenance completed", "benign"),
    ("Database connection established successfully", "benign"),
    ("Normal user logout recorded", "benign"),
    ("System health check completed successfully", "benign"),
    ("Regular application activity recorded", "benign"),
    ("Routine database backup completed", "benign"),
]


# ==========================================
# 3. SEPARATE TEXT AND LABELS
# ==========================================

texts = [item[0] for item in training_data]
labels = [item[1] for item in training_data]


# ==========================================
# 4. SPLIT TRAINING AND TEST DATA
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(
    texts,
    labels,
    test_size=0.30,
    random_state=42,
    stratify=labels
)


# ==========================================
# 5. CREATE MACHINE LEARNING PIPELINE
# ==========================================

model = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("classifier", LogisticRegression(max_iter=1000))
])


# ==========================================
# 6. TRAIN THE MODEL
# ==========================================

model.fit(X_train, y_train)


# ==========================================
# 7. EVALUATE THE MODEL
# ==========================================

predictions = model.predict(X_test)

accuracy = accuracy_score(y_test, predictions)

print("\n========== CYBERMIND AI MODEL RESULTS ==========")
print(f"Accuracy: {accuracy:.2%}")

print("\nClassification Report:")
print(classification_report(y_test, predictions, zero_division=0))


# ==========================================
# 8. SAVE THE TRAINED MODEL
# ==========================================

MODEL_DIR.mkdir(parents=True, exist_ok=True)

joblib.dump(model, MODEL_PATH)

print(f"\nModel saved successfully at: {MODEL_PATH}")
