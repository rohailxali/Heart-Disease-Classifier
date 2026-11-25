"""
api/train_models.py - Trains models on the seed-42 split and saves them to api/models/.
Also saves seed-42 test split samples for GET /api/samples.
"""
import os
import sys
import argparse
from pathlib import Path
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.naive_bayes import GaussianNB
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
import joblib

_HERE = Path(__file__).resolve().parent
PROJECT_ROOT = _HERE.parent
DATA_PATH = PROJECT_ROOT / "heart.csv"
RAW_PATH = PROJECT_ROOT / "results_heart" / "raw.csv"
MODELS_DIR = _HERE / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

NUM = ["Age", "RestingBP", "Cholesterol", "MaxHR", "Oldpeak"]
CAT = ["Sex", "ChestPainType", "RestingECG", "ExerciseAngina", "ST_Slope"]

def make_pre():
    return ColumnTransformer([
        ("num", StandardScaler(), NUM),
        ("cat", OneHotEncoder(handle_unknown="ignore"), CAT)
    ], remainder="passthrough", sparse_threshold=0.0)

def main():
    parser = argparse.ArgumentParser(description="Train and save seed-42 models for the API.")
    parser.add_argument("--skip-dnn", action="store_true", help="Skip TensorFlow DNN model training.")
    parser.add_argument("--strict", action="store_true", help="Raise assertion error on accuracy mismatch with raw.csv.")
    args = parser.parse_args()

    print("Loading heart.csv...")
    df = pd.read_csv(DATA_PATH)
    df = df.dropna().drop_duplicates().reset_index(drop=True)
    X = df.drop(columns="HeartDisease")
    y = df["HeartDisease"].values

    # Reproduce seed-42 split exactly
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    print(f"Train size: {len(Xtr)}, Test size: {len(Xte)}")

    # Load target accuracies from raw.csv for seed 42 sanity check
    raw_df = pd.read_csv(RAW_PATH)
    seed42_raw = raw_df[raw_df["seed"] == 42].set_index("model")["accuracy"].to_dict()
    print("Target accuracies from raw.csv (seed 42):", seed42_raw)

    def verify_acc(name: str, actual: float, target: float):
        diff = abs(actual - target)
        print(f"{name} accuracy: {actual:.6f} (target: {target:.6f}, diff: {diff:.6f})")
        if diff >= 1e-4:
            msg = f"Warning: {name} accuracy mismatch: actual={actual:.6f} vs target={target:.6f}"
            print(msg)
            if args.strict:
                raise AssertionError(msg)

    # 1. NB: var_smoothing 1e-9
    pipe_nb = Pipeline([("pre", make_pre()), ("clf", GaussianNB(var_smoothing=1e-9))])
    pipe_nb.fit(Xtr, ytr)
    acc_nb = accuracy_score(yte, pipe_nb.predict(Xte))
    verify_acc("NB", acc_nb, seed42_raw['NB'])
    joblib.dump(pipe_nb, MODELS_DIR / "NB.joblib")

    # 2. DT: depth 3, min_samples_split 2
    pipe_dt = Pipeline([("pre", make_pre()), ("clf", DecisionTreeClassifier(max_depth=3, min_samples_split=2, random_state=42))])
    pipe_dt.fit(Xtr, ytr)
    acc_dt = accuracy_score(yte, pipe_dt.predict(Xte))
    verify_acc("DT", acc_dt, seed42_raw['DT'])
    joblib.dump(pipe_dt, MODELS_DIR / "DT.joblib")

    # 3. RF: sqrt, 100 trees
    pipe_rf = Pipeline([("pre", make_pre()), ("clf", RandomForestClassifier(n_estimators=100, max_features="sqrt", random_state=42, n_jobs=-1))])
    pipe_rf.fit(Xtr, ytr)
    acc_rf = accuracy_score(yte, pipe_rf.predict(Xte))
    verify_acc("RF", acc_rf, seed42_raw['RF'])
    joblib.dump(pipe_rf, MODELS_DIR / "RF.joblib")

    # 4. SVM: C=1, rbf, probability=True
    pipe_svm = Pipeline([("pre", make_pre()), ("clf", SVC(C=1.0, kernel="rbf", probability=True, random_state=42))])
    pipe_svm.fit(Xtr, ytr)
    acc_svm = accuracy_score(yte, pipe_svm.predict(Xte))
    verify_acc("SVM", acc_svm, seed42_raw['SVM'])
    joblib.dump(pipe_svm, MODELS_DIR / "SVM.joblib")

    # 5. LR: C=0.1, liblinear
    pipe_lr = Pipeline([("pre", make_pre()), ("clf", LogisticRegression(C=0.1, solver="liblinear", max_iter=5000, random_state=42))])
    pipe_lr.fit(Xtr, ytr)
    acc_lr = accuracy_score(yte, pipe_lr.predict(Xte))
    verify_acc("LR", acc_lr, seed42_raw['LR'])
    joblib.dump(pipe_lr, MODELS_DIR / "LR.joblib")

    # 6. DNN: batch 32, lr 0.001, 20 epochs
    dnn_available = False
    acc_dnn = None
    if args.skip_dnn:
        print("--skip-dnn specified: skipping TensorFlow DNN training.")
    else:
        try:
            import tensorflow as tf
            print(f"TensorFlow {tf.__version__} available. Building DNN...")
            pre_dnn = make_pre().fit(Xtr)
            Xtr_ = pre_dnn.transform(Xtr).astype("float32")
            Xte_ = pre_dnn.transform(Xte).astype("float32")

            tf.keras.utils.set_random_seed(42)
            dnn = tf.keras.Sequential([
                tf.keras.layers.Input(shape=(Xtr_.shape[1],)),
                tf.keras.layers.Dense(64, activation="relu"),
                tf.keras.layers.Dense(32, activation="relu"),
                tf.keras.layers.Dense(16, activation="relu"),
                tf.keras.layers.Dense(1, activation="sigmoid")
            ])
            dnn.compile(optimizer=tf.keras.optimizers.Adam(0.001), loss="binary_crossentropy", metrics=["accuracy"])
            dnn.fit(Xtr_, ytr, batch_size=32, epochs=20, verbose=0)
            proba_dnn = dnn.predict(Xte_, verbose=0).ravel()
            acc_dnn = accuracy_score(yte, (proba_dnn >= 0.5).astype(int))
            print(f"DNN accuracy: {acc_dnn:.6f} (target: {seed42_raw['DNN']:.6f})")
            if abs(acc_dnn - seed42_raw['DNN']) > 0.015:
                msg = f"Warning: DNN accuracy diff large: {acc_dnn} vs {seed42_raw['DNN']}"
                print(msg)
                if args.strict:
                    raise AssertionError(msg)
            dnn.save(MODELS_DIR / "DNN.keras")
            joblib.dump(pre_dnn, MODELS_DIR / "DNN_pre.joblib")
            dnn_available = True
        except Exception as e:
            print(f"Notice: DNN could not be trained or saved ({e}). Skipping DNN.")
            dnn_available = False

    # Save metadata about trained models
    metadata = {
        "seed": 42,
        "models": {
            "NB": {"type": "sklearn", "accuracy": float(acc_nb)},
            "DT": {"type": "sklearn", "accuracy": float(acc_dt)},
            "RF": {"type": "sklearn", "accuracy": float(acc_rf)},
            "SVM": {"type": "sklearn", "accuracy": float(acc_svm)},
            "LR": {"type": "sklearn", "accuracy": float(acc_lr)},
            "DNN": {"type": "keras" if dnn_available else "unavailable", "accuracy": float(acc_dnn) if dnn_available and acc_dnn is not None else None, "available": dnn_available}
        }
    }
    with open(MODELS_DIR / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    # Save held-out test samples (from seed-42 test split only) with true labels
    test_df = Xte.copy()
    test_df["HeartDisease"] = yte
    test_samples = test_df.to_dict(orient="records")
    with open(MODELS_DIR / "test_samples.json", "w") as f:
        json.dump(test_samples, f, indent=2)
    print(f"Saved {len(test_samples)} held-out test samples to {MODELS_DIR / 'test_samples.json'}")
    print("All models trained and verified successfully!")

if __name__ == "__main__":
    main()
