"""
api/main.py - FastAPI application for live heart disease risk prediction.
"""
import os
import sys
import logging
from pathlib import Path
import json
import random
from typing import Dict, Any, List, Optional
from enum import Enum

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
import pandas as pd
import numpy as np
import joblib
import sklearn

_HERE = Path(__file__).resolve().parent
MODELS_DIR = _HERE / "models"
SCHEMA_STATS_PATH = MODELS_DIR / "schema_stats.json"
FRONTEND_DIST_DIR = _HERE.parent / "frontend" / "dist"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

app = FastAPI(
    title="Heart Disease Classification API",
    description="Live prediction API reproducing Simanjuntak et al. (2025) seed-42 models.",
    version="1.0.0"
)

# CORS configuration
# Default to "*" so the public demo works without env vars.
# Override with ALLOWED_ORIGINS=https://yourdomain.com in production for stricter policy.
_origins_env = os.environ.get("ALLOWED_ORIGINS", "*")
if _origins_env.strip() == "*":
    allowed_origins = ["*"]
else:
    allowed_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom validation error handler for friendly 422 messages
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field_name = " -> ".join(str(loc) for loc in err["loc"] if loc != "body")
        errors.append({
            "field": field_name,
            "message": err["msg"],
            "type": err["type"]
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error in patient inputs", "errors": errors}
    )

# Enums for categorical features
class SexEnum(str, Enum):
    M = "M"
    F = "F"

class ChestPainTypeEnum(str, Enum):
    TA = "TA"    # Typical Angina
    ATA = "ATA"  # Atypical Angina
    NAP = "NAP"  # Non-Anginal Pain
    ASY = "ASY"  # Asymptomatic

class RestingECGEnum(str, Enum):
    Normal = "Normal"
    ST = "ST"          # ST-T wave abnormality
    LVH = "LVH"        # Left ventricular hypertrophy

class ExerciseAnginaEnum(str, Enum):
    N = "N"
    Y = "Y"

class STSlopeEnum(str, Enum):
    Up = "Up"
    Flat = "Flat"
    Down = "Down"

class PatientInput(BaseModel):
    Age: int = Field(..., ge=18, le=120, description="Age in years (18-120)")
    Sex: SexEnum = Field(..., description="Sex: M or F")
    ChestPainType: ChestPainTypeEnum = Field(..., description="Chest pain type: TA, ATA, NAP, ASY")
    RestingBP: float = Field(..., ge=0, le=300, description="Resting blood pressure in mm Hg (0-300)")
    Cholesterol: float = Field(..., ge=0, le=1000, description="Serum cholesterol in mm/dl (0-1000)")
    FastingBS: int = Field(..., ge=0, le=1, description="Fasting blood sugar > 120 mg/dl (1 = true, 0 = false)")
    RestingECG: RestingECGEnum = Field(..., description="Resting ECG: Normal, ST, LVH")
    MaxHR: int = Field(..., ge=50, le=250, description="Maximum heart rate achieved (50-250)")
    ExerciseAngina: ExerciseAnginaEnum = Field(..., description="Exercise-induced angina: Y or N")
    Oldpeak: float = Field(..., ge=-5.0, le=10.0, description="ST depression induced by exercise relative to rest (-5 to 10)")
    ST_Slope: STSlopeEnum = Field(..., description="Slope of peak exercise ST segment: Up, Flat, Down")

# Load models and samples on startup
models: Dict[str, Any] = {}
dnn_model = None
dnn_pre = None
test_samples: List[Dict[str, Any]] = []

def load_all_models():
    global models, dnn_model, dnn_pre, test_samples
    for name in ["NB", "DT", "RF", "SVM", "LR"]:
        p = MODELS_DIR / f"{name}.joblib"
        if p.exists():
            try:
                models[name] = joblib.load(p)
            except Exception as e:
                logger.error(f"Failed to load {p}: {e}")

    # Check for DNN
    dnn_path = MODELS_DIR / "DNN.keras"
    dnn_pre_path = MODELS_DIR / "DNN_pre.joblib"
    if dnn_path.exists() and dnn_pre_path.exists():
        try:
            import tensorflow as tf
            dnn_model = tf.keras.models.load_model(dnn_path)
            dnn_pre = joblib.load(dnn_pre_path)
        except Exception:
            dnn_model = None
            dnn_pre = None

    samples_path = MODELS_DIR / "test_samples.json"
    if samples_path.exists():
        with open(samples_path, "r") as f:
            test_samples = json.load(f)

    if not models:
        logger.warning("Models not found. Run 'python api/train_models.py' to train and save models.")

load_all_models()

# Load precomputed schema statistics (never read heart.csv at runtime)
schema_stats: Dict[str, Any] = {}
if SCHEMA_STATS_PATH.exists():
    try:
        with open(SCHEMA_STATS_PATH, "r") as f:
            schema_stats = json.load(f)
    except Exception as e:
        logger.warning(f"Could not read schema_stats.json: {e}")
else:
    logger.warning("schema_stats.json not found in models/. Run 'python api/train_models.py --skip-dnn' to generate it.")

chol_zero_count = schema_stats.get("chol_zero_count", 172)
chol_zero_disease_rate = schema_stats.get("chol_zero_disease_rate_pct", 88.4)
feature_stats = schema_stats.get("features", {})

chol_zero_note = (
    f"Dataset codes missing values as 0. {chol_zero_count} patients have Cholesterol=0, "
    f"which heavily correlates with heart disease ({chol_zero_disease_rate}% disease rate)."
)

@app.get("/api")
def get_service_info():
    return {
        "service": "Heart Disease Classification API",
        "description": "Replication of Simanjuntak et al. (JAIC 2025)",
        "version": "1.0.0",
        "status": "online",
        "docs_url": "/docs",
        "openapi_url": "/openapi.json",
        "health_endpoint": "/api/health",
        "predict_endpoint": "/api/predict"
    }

@app.get("/api/health")
def get_health():
    return {
        "status": "healthy",
        "models_loaded": list(models.keys()),
        "dnn_available": dnn_model is not None,
        "test_samples_count": len(test_samples),
        "seed": 42,
        "sklearn_version": sklearn.__version__
    }

@app.get("/api/schema")
def get_schema():
    age_stats = feature_stats.get("Age", {})
    bp_stats = feature_stats.get("RestingBP", {})
    chol_stats = feature_stats.get("Cholesterol", {})
    hr_stats = feature_stats.get("MaxHR", {})
    oldpeak_stats = feature_stats.get("Oldpeak", {})

    return {
        "features": [
            {
                "name": "Age",
                "label": "Age",
                "type": "numeric",
                "min": age_stats.get("min", 28),
                "max": age_stats.get("max", 77),
                "default": age_stats.get("median", 54),
                "step": 1,
                "unit": "years",
                "description": "Patient age in years"
            },
            {
                "name": "Sex",
                "label": "Sex",
                "type": "categorical",
                "options": [
                    {"value": "M", "label": "Male"},
                    {"value": "F", "label": "Female"}
                ],
                "default": "M",
                "description": "Biological sex"
            },
            {
                "name": "ChestPainType",
                "label": "Chest Pain Type",
                "type": "categorical",
                "options": [
                    {"value": "ASY", "label": "Asymptomatic (ASY)"},
                    {"value": "NAP", "label": "Non-Anginal Pain (NAP)"},
                    {"value": "ATA", "label": "Atypical Angina (ATA)"},
                    {"value": "TA", "label": "Typical Angina (TA)"}
                ],
                "default": "ASY",
                "description": "Reported chest pain type (TA = typical angina, ATA = atypical angina, NAP = non-anginal pain, ASY = asymptomatic)"
            },
            {
                "name": "RestingBP",
                "label": "Resting Blood Pressure",
                "type": "numeric",
                "min": bp_stats.get("positive_min", 80),
                "max": bp_stats.get("max", 200),
                "default": bp_stats.get("median", 130),
                "step": 1,
                "unit": "mm Hg",
                "description": "Resting blood pressure in mm Hg upon hospital admission"
            },
            {
                "name": "Cholesterol",
                "label": "Serum Cholesterol",
                "type": "numeric",
                "min": chol_stats.get("min", 0),
                "max": chol_stats.get("max", 603),
                "default": chol_stats.get("median", 223),
                "step": 1,
                "unit": "mg/dl",
                "zero_note": chol_zero_note,
                "description": "Serum cholesterol in mg/dl"
            },
            {
                "name": "FastingBS",
                "label": "Fasting Blood Sugar",
                "type": "binary",
                "options": [
                    {"value": 0, "label": "Normal (≤ 120 mg/dl)"},
                    {"value": 1, "label": "Elevated (> 120 mg/dl)"}
                ],
                "default": 0,
                "description": "Fasting blood sugar > 120 mg/dl (1 = true, 0 = false)"
            },
            {
                "name": "RestingECG",
                "label": "Resting ECG",
                "type": "categorical",
                "options": [
                    {"value": "Normal", "label": "Normal"},
                    {"value": "ST", "label": "ST-T Wave Abnormality (ST)"},
                    {"value": "LVH", "label": "Left Ventricular Hypertrophy (LVH)"}
                ],
                "default": "Normal",
                "description": "Resting electrocardiographic results"
            },
            {
                "name": "MaxHR",
                "label": "Maximum Heart Rate",
                "type": "numeric",
                "min": hr_stats.get("min", 60),
                "max": hr_stats.get("max", 202),
                "default": hr_stats.get("median", 138),
                "step": 1,
                "unit": "bpm",
                "description": "Maximum heart rate achieved during exercise stress test"
            },
            {
                "name": "ExerciseAngina",
                "label": "Exercise-Induced Angina",
                "type": "binary_str",
                "options": [
                    {"value": "N", "label": "No"},
                    {"value": "Y", "label": "Yes"}
                ],
                "default": "N",
                "description": "Exercise-induced angina (Y = Yes, N = No)"
            },
            {
                "name": "Oldpeak",
                "label": "ST Depression (Oldpeak)",
                "type": "numeric",
                "min": oldpeak_stats.get("min", -2.6),
                "max": oldpeak_stats.get("max", 6.2),
                "default": 0.0,
                "step": 0.1,
                "unit": "mm",
                "description": "ST depression induced by exercise relative to rest"
            },
            {
                "name": "ST_Slope",
                "label": "ST Slope",
                "type": "categorical",
                "options": [
                    {"value": "Up", "label": "Upsloping (Up)"},
                    {"value": "Flat", "label": "Flat"},
                    {"value": "Down", "label": "Downsloping (Down)"}
                ],
                "default": "Flat",
                "description": "Slope of the peak exercise ST segment"
            }
        ]
    }

@app.get("/api/samples")
def get_samples(n: int = Query(1, ge=1, le=20)):
    if not test_samples:
        raise HTTPException(status_code=500, detail="Held-out test samples not loaded")
    count = min(n, len(test_samples))
    chosen = random.sample(test_samples, count)
    return {"samples": chosen, "count": len(chosen), "source": "Held-out seed-42 test split (N=184)"}

@app.post("/api/predict")
def predict_heart_disease(patient: PatientInput):
    if not models:
        raise HTTPException(
            status_code=503,
            detail="Models not loaded. Please run 'python api/train_models.py' first."
        )

    row = {
        "Age": patient.Age,
        "Sex": patient.Sex.value,
        "ChestPainType": patient.ChestPainType.value,
        "RestingBP": patient.RestingBP,
        "Cholesterol": patient.Cholesterol,
        "FastingBS": patient.FastingBS,
        "RestingECG": patient.RestingECG.value,
        "MaxHR": patient.MaxHR,
        "ExerciseAngina": patient.ExerciseAngina.value,
        "Oldpeak": patient.Oldpeak,
        "ST_Slope": patient.ST_Slope.value
    }
    df = pd.DataFrame([row])

    predictions = {}
    probabilities = {}

    for name, pipe in models.items():
        try:
            pred = int(pipe.predict(df)[0])
            predictions[name] = pred
            if hasattr(pipe, "predict_proba"):
                proba = float(pipe.predict_proba(df)[0, 1])
            elif hasattr(pipe, "decision_function"):
                dec = float(pipe.decision_function(df)[0])
                proba = float(1 / (1 + np.exp(-dec)))
            else:
                proba = float(pred)
            probabilities[name] = round(proba, 4)
        except Exception as e:
            predictions[name] = None
            probabilities[name] = None

    if dnn_model is not None and dnn_pre is not None:
        try:
            df_trans = dnn_pre.transform(df).astype("float32")
            proba_dnn = float(dnn_model.predict(df_trans, verbose=0)[0, 0])
            pred_dnn = 1 if proba_dnn >= 0.5 else 0
            predictions["DNN"] = pred_dnn
            probabilities["DNN"] = round(proba_dnn, 4)
        except Exception:
            predictions["DNN"] = None
            probabilities["DNN"] = None
    else:
        predictions["DNN"] = None
        probabilities["DNN"] = None

    valid_probas = [p for p in probabilities.values() if p is not None]
    valid_preds = [pr for pr in predictions.values() if pr is not None]

    mean_proba = round(float(np.mean(valid_probas)), 4) if valid_probas else 0.0
    disease_votes = sum(1 for p in valid_preds if p == 1)
    total_models = len(valid_preds)
    ensemble_label = 1 if mean_proba >= 0.5 else 0

    return {
        "ensemble": {
            "probability": mean_proba,
            "prediction": ensemble_label,
            "label": "Heart Disease" if ensemble_label == 1 else "Normal / Healthy",
            "agreement": f"{disease_votes} of {total_models} models predict disease",
            "disease_votes": disease_votes,
            "total_models": total_models,
            "consensus_pct": round(disease_votes / total_models * 100, 1) if total_models > 0 else 0
        },
        "models": {
            name: {
                "probability": probabilities.get(name),
                "prediction": predictions.get(name),
                "label": ("Heart Disease" if predictions.get(name) == 1 else "Healthy") if predictions.get(name) is not None else "Unavailable",
                "available": predictions.get(name) is not None
            }
            for name in ["NB", "DT", "RF", "SVM", "LR", "DNN"]
        },
        "input_features": row,
        "disclaimer": "Educational demonstration reproducing Simanjuntak et al. (2025). This interface is NOT a certified medical diagnostic device and should never replace clinical judgment."
    }

# Mount frontend static files after all API routes if SERVE_FRONTEND=1
if os.environ.get("SERVE_FRONTEND") == "1" and FRONTEND_DIST_DIR.exists():
    logger.info(f"Mounting static frontend files from {FRONTEND_DIST_DIR}")
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST_DIR), html=True), name="frontend")
else:
    @app.get("/")
    def get_root_info():
        return get_service_info()
