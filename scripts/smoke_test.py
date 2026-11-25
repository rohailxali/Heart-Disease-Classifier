"""
scripts/smoke_test.py - Automated smoke test for API and verification of seed-42 models.
"""
import sys
import os
import time
import subprocess
import json
import urllib.request
import urllib.error
from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib

_HERE = Path(__file__).resolve().parent
PROJECT_ROOT = _HERE.parent
DATA_PATH = PROJECT_ROOT / "heart.csv"
RAW_PATH = PROJECT_ROOT / "results_heart" / "raw.csv"
MODELS_DIR = PROJECT_ROOT / "api" / "models"

def verify_seed42_models():
    print("[1/3] Verifying sklearn models against results_heart/raw.csv seed 42...")
    df = pd.read_csv(DATA_PATH).dropna().drop_duplicates().reset_index(drop=True)
    X = df.drop(columns="HeartDisease")
    y = df["HeartDisease"].values

    _, Xte, _, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    raw_df = pd.read_csv(RAW_PATH)
    seed42_targets = raw_df[raw_df["seed"] == 42].set_index("model")["accuracy"].to_dict()

    for name in ["NB", "DT", "RF", "SVM", "LR"]:
        model_path = MODELS_DIR / f"{name}.joblib"
        if not model_path.exists():
            raise FileNotFoundError(f"Model file {model_path} not found. Run api/train_models.py first.")
        pipe = joblib.load(model_path)
        pred = pipe.predict(Xte)
        acc = accuracy_score(yte, pred)
        target = seed42_targets[name]
        diff = abs(acc - target)
        print(f"  ✓ {name}: actual={acc:.6f}, target={target:.6f}, diff={diff:.6f}")
        assert diff < 1e-4, f"Accuracy mismatch for {name}: {acc} vs {target}"

def test_api_endpoints():
    print("[2/3] Starting uvicorn server for API endpoint testing...")
    env = os.environ.copy()
    env["PYTHONPATH"] = str(PROJECT_ROOT)
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "api.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=str(PROJECT_ROOT),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    try:
        # Wait for server up
        base_url = "http://127.0.0.1:8000"
        health_url = f"{base_url}/api/health"
        server_ready = False
        for _ in range(30):
            try:
                with urllib.request.urlopen(health_url, timeout=1) as resp:
                    if resp.status == 200:
                        server_ready = True
                        break
            except Exception:
                time.sleep(0.5)

        if not server_ready:
            raise RuntimeError("FastAPI server failed to start within 15 seconds.")
        print("  ✓ Server is online.")

        # Test GET /
        with urllib.request.urlopen(f"{base_url}/", timeout=5) as resp:
            assert resp.status == 200
            data = json.loads(resp.read().decode())
            assert data.get("status") == "online"
            print("  ✓ GET / passed:", data.get("service"))

        # Test GET /api/health
        with urllib.request.urlopen(health_url, timeout=5) as resp:
            assert resp.status == 200
            health = json.loads(resp.read().decode())
            assert health.get("status") == "healthy"
            assert "sklearn_version" in health
            assert len(health.get("models_loaded", [])) >= 5
            print(f"  ✓ GET /api/health passed: sklearn={health.get('sklearn_version')}, models={health.get('models_loaded')}")

        # Test GET /api/schema
        with urllib.request.urlopen(f"{base_url}/api/schema", timeout=5) as resp:
            assert resp.status == 200
            schema = json.loads(resp.read().decode())
            features = schema.get("features", [])
            assert len(features) == 11
            chol_feat = next(f for f in features if f["name"] == "Cholesterol")
            assert "zero_note" in chol_feat
            assert "172" in chol_feat["zero_note"]
            print("  ✓ GET /api/schema passed: dynamic zero_note verified.")

        # Test GET /api/samples?n=1
        with urllib.request.urlopen(f"{base_url}/api/samples?n=1", timeout=5) as resp:
            assert resp.status == 200
            samples = json.loads(resp.read().decode())
            assert samples.get("count") == 1
            sample = samples.get("samples", [])[0]
            assert "HeartDisease" in sample
            assert "Age" in sample
            print("  ✓ GET /api/samples passed: 1 test split sample retrieved.")

        # Test POST /api/predict
        patient_input = {
            "Age": 54,
            "Sex": "M",
            "ChestPainType": "ASY",
            "RestingBP": 130,
            "Cholesterol": 223,
            "FastingBS": 0,
            "RestingECG": "Normal",
            "MaxHR": 138,
            "ExerciseAngina": "N",
            "Oldpeak": 0.0,
            "ST_Slope": "Flat"
        }
        req = urllib.request.Request(
            f"{base_url}/api/predict",
            data=json.dumps(patient_input).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            assert resp.status == 200
            pred_data = json.loads(resp.read().decode())
            assert "ensemble" in pred_data
            assert "probability" in pred_data["ensemble"]
            assert 0.0 <= pred_data["ensemble"]["probability"] <= 1.0
            assert "models" in pred_data
            assert pred_data["models"]["SVM"]["probability"] is not None
            print(f"  ✓ POST /api/predict passed: ensemble_prob={pred_data['ensemble']['probability']:.4f}, agreement={pred_data['ensemble']['agreement']}")

    finally:
        proc.terminate()
        proc.wait(timeout=5)
        print("  ✓ uvicorn server terminated.")

def main():
    print("=" * 60)
    print("RUNNING SMOKE TEST SUITE")
    print("=" * 60)
    verify_seed42_models()
    test_api_endpoints()
    print("=" * 60)
    print("[3/3] ALL SMOKE TESTS PASSED CLEANLY!")
    print("=" * 60)

if __name__ == "__main__":
    main()
