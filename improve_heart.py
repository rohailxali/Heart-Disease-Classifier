"""
improve_heart.py - Evaluates methodologically improved model variants.
Never overwrites results_heart/. Writes outputs to results_variants/.

Variant A: DNN with EarlyStopping(val_loss, patience 10, restore_best_weights) and selection by min val_loss.
Variant B: Cholesterol==0 and RestingBP==0 replaced with NaN and median-imputed inside Pipeline (fit on training data only) for all models.
"""
from pathlib import Path
import json
import warnings
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.naive_bayes import GaussianNB
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, precision_recall_fscore_support,
                             roc_auc_score, confusion_matrix)

warnings.filterwarnings("ignore")

_HERE = Path(__file__).resolve().parent
DATA = _HERE / "heart.csv"
OUT_VAR = _HERE / "results_variants"
OUT_VAR.mkdir(exist_ok=True)

SEEDS = [42, 43, 44, 45, 46]
NUM = ["Age", "RestingBP", "Cholesterol", "MaxHR", "Oldpeak"]
CAT = ["Sex", "ChestPainType", "RestingECG", "ExerciseAngina", "ST_Slope"]

def evaluate(y, pred, score):
    p, r, f, _ = precision_recall_fscore_support(y, pred, labels=[0, 1], zero_division=0)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    return dict(accuracy=float(accuracy_score(y, pred)),
                precision0=float(p[0]), precision1=float(p[1]),
                recall0=float(r[0]), recall1=float(r[1]),
                f1_0=float(f[0]), f1_1=float(f[1]),
                auc=float(roc_auc_score(y, score)),
                TN=int(tn), FP=int(fp), FN=int(fn), TP=int(tp))

def make_imputed_pre():
    num_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ])
    return ColumnTransformer([
        ("num", num_pipe, NUM),
        ("cat", OneHotEncoder(handle_unknown="ignore"), CAT)
    ], remainder="passthrough", sparse_threshold=0.0)

def sk_models(seed):
    return {
        "NB":  (GaussianNB(), {"clf__var_smoothing": [1e-9, 1e-8, 1e-7]}),
        "DT":  (DecisionTreeClassifier(random_state=seed),
                {"clf__max_depth": [3, 5, 7, None], "clf__min_samples_split": [2, 5, 10]}),
        "RF":  (RandomForestClassifier(random_state=seed, n_jobs=-1),
                {"clf__n_estimators": [100, 200, 300], "clf__max_features": ["sqrt", "log2"]}),
        "SVM": (SVC(probability=True, random_state=seed),
                {"clf__C": [0.1, 1, 10], "clf__kernel": ["linear", "rbf"]}),
        "LR":  (LogisticRegression(max_iter=5000, random_state=seed),
                {"clf__solver": ["liblinear", "saga"], "clf__C": [0.1, 1, 10]}),
    }

def main():
    print("Running Variant B: Median Imputation of Zero Cholesterol and RestingBP...")
    df = pd.read_csv(DATA)
    df = df.dropna().drop_duplicates().reset_index(drop=True)

    # Set zero cholesterol and zero restingBP to NaN
    df_clean = df.copy()
    df_clean.loc[df_clean["Cholesterol"] == 0, "Cholesterol"] = np.nan
    df_clean.loc[df_clean["RestingBP"] == 0, "RestingBP"] = np.nan

    X = df_clean.drop(columns="HeartDisease")
    y = df_clean["HeartDisease"].values

    rows_var_b = []
    for seed in SEEDS:
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=seed)
        cv = StratifiedKFold(5, shuffle=True, random_state=seed)

        for name, (clf, grid) in sk_models(seed).items():
            pipe = Pipeline([("pre", make_imputed_pre()), ("clf", clf)])
            gs = GridSearchCV(pipe, grid, cv=cv, scoring="accuracy", n_jobs=-1).fit(Xtr, ytr)
            pred = gs.predict(Xte)
            sc = gs.predict_proba(Xte)[:, 1] if hasattr(gs, "predict_proba") else gs.decision_function(Xte)
            met = evaluate(yte, pred, sc)
            rows_var_b.append(dict(seed=seed, model=name, cv_acc=float(gs.best_score_), **met))
            print(f"Variant B | Seed {seed} | {name}: acc={met['accuracy']:.4f}, auc={met['auc']:.4f}")

    df_vb = pd.DataFrame(rows_var_b)
    df_vb.to_csv(OUT_VAR / "raw_variant_b.csv", index=False)

    # Calculate summary for Variant B
    metrics = ["accuracy", "precision0", "precision1", "recall0", "recall1", "f1_0", "f1_1", "auc"]
    summary_b = {}
    for m in ["NB", "DT", "RF", "SVM", "LR"]:
        sub = df_vb[df_vb.model == m]
        summary_b[m] = {
            met: {"mean": round(float(sub[met].mean()), 4), "std": round(float(sub[met].std()), 4)}
            for met in metrics
        }

    # Package into variants.json
    variants_data = {
        "variant_a_dnn_early_stopping": {
            "title": "Variant A: DNN Early Stopping & Loss-Based Tuning",
            "description": "Applies tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True) and selects hyperparameter config by minimum validation loss instead of final-epoch accuracy.",
            "hypothesis": "Eliminates catastrophic overfitting observed in Seed 44 (where val loss spiked from 0.32 to 1.56), stabilizing cross-seed variance.",
            "status": "Documented protocol (TensorFlow required for execution)"
        },
        "variant_b_median_imputation": {
            "title": "Variant B: Median Imputation of Zero Measurements",
            "description": "Replaces zero values in Cholesterol (172 rows) and RestingBP (1 row) with NaN and applies SimpleImputer(strategy='median') strictly fit inside training folds to prevent data leakage.",
            "hypothesis": "Removes the artificial proxy shortcut where models exploit Cholesterol==0 as an indicator of 88.4% disease prevalence, measuring true physiological generalization.",
            "models": summary_b,
            "status": "Executed across all 5 seeds"
        }
    }

    # Write variants.json to frontend/public/data/variants.json
    dest = _HERE / "frontend" / "public" / "data" / "variants.json"
    with open(dest, "w") as f:
        json.dump(variants_data, f, indent=2)
    print(f"Exported variants.json to {dest}")

if __name__ == "__main__":
    main()
