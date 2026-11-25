"""
export_results.py – reads results_heart/*.csv and heart.csv,
writes frontend/public/data/*.json for the static dashboard.
Run from any working directory.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

# ── paths ──────────────────────────────────────────────────────────────────────
_HERE   = Path(__file__).resolve().parent
RH      = _HERE / "results_heart"
RV      = _HERE / "results_variants"
DATA    = _HERE / "heart.csv"
OUT     = _HERE / "frontend" / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)

# ── helpers ────────────────────────────────────────────────────────────────────
def jdump(obj, path: Path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, allow_nan=False, indent=2)
    print(f"  wrote {path.name}")

def _cast(v):
    """Convert numpy types to plain Python; NaN → None."""
    if v is None:
        return None
    if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        f = float(v)
        return int(f) if f == int(f) else round(f, 6)
    if isinstance(v, np.ndarray):
        return [_cast(x) for x in v]
    return v

def safe(obj):
    """Recursively sanitize a nested structure."""
    if isinstance(obj, dict):
        return {k: safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [safe(x) for x in obj]
    return _cast(obj)

MODELS  = ["NB", "DT", "RF", "SVM", "LR", "DNN"]
SEEDS   = [42, 43, 44, 45, 46]
METRICS = ["accuracy", "precision0", "precision1", "recall0", "recall1", "f1_0", "f1_1", "auc"]

NUM_COLS = ["Age", "RestingBP", "Cholesterol", "MaxHR", "Oldpeak"]
CAT_COLS = ["Sex", "ChestPainType", "FastingBS", "RestingECG", "ExerciseAngina", "ST_Slope"]

# ── load raw data ──────────────────────────────────────────────────────────────
raw = pd.read_csv(RH / "raw.csv")
params_df = pd.read_csv(RH / "best_params.csv")
df  = pd.read_csv(DATA)

# ── 1. meta.json ──────────────────────────────────────────────────────────────
print("→ meta.json")
import sklearn, platform
try:
    import tensorflow as tf
    tf_ver = tf.__version__
except Exception:
    tf_ver = "unavailable"

meta = {
    "paper": {
        "title": "A Comparative Study of ML and DL Models for Heart Disease Classification",
        "authors": "Simanjuntak, Robet & Hoki",
        "journal": "JAIC",
        "volume": 9,
        "issue": 6,
        "year": 2025,
        "pages": "3405-3409",
    },
    "dataset": {
        "source": "Kaggle Heart Failure Prediction Dataset",
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "features": list(df.columns.drop("HeartDisease")),
        "target": "HeartDisease",
    },
    "seeds": SEEDS,
    "split": {"train": 734, "test": 184, "disease_in_test": 102, "healthy_in_test": 82},
    "one_patient_pct": round(1 / 184 * 100, 4),
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "library_versions": {
        "python": platform.python_version(),
        "pandas": pd.__version__,
        "numpy": np.__version__,
        "sklearn": sklearn.__version__,
        "tensorflow": tf_ver,
    },
}
jdump(safe(meta), OUT / "meta.json")

# ── 2. eda.json ───────────────────────────────────────────────────────────────
print("→ eda.json")

class_counts = df["HeartDisease"].value_counts().to_dict()

def histograms_by_class(col, bins=20):
    hd0 = df[df.HeartDisease == 0][col]
    hd1 = df[df.HeartDisease == 1][col]
    all_min = float(df[col].min())
    all_max = float(df[col].max())
    edges = np.linspace(all_min, all_max, bins + 1)
    counts0, _ = np.histogram(hd0, bins=edges)
    counts1, _ = np.histogram(hd1, bins=edges)
    return {
        "edges": [round(float(e), 4) for e in edges],
        "healthy": counts0.tolist(),
        "disease": counts1.tolist(),
    }

num_histograms = {col: histograms_by_class(col) for col in NUM_COLS}

def cat_counts(col):
    tbl = df.groupby([col, "HeartDisease"]).size().unstack(fill_value=0)
    out = {}
    for cat in tbl.index:
        out[str(cat)] = {
            "healthy": int(tbl.loc[cat, 0]) if 0 in tbl.columns else 0,
            "disease": int(tbl.loc[cat, 1]) if 1 in tbl.columns else 0,
        }
    return out

cat_counts_dict = {col: cat_counts(col) for col in CAT_COLS}

# Correlation matrix (numeric + HeartDisease)
num_df = df.select_dtypes("number")
corr = num_df.corr().round(4)

# Data-quality block
zero_chol = int((df.Cholesterol == 0).sum())
zero_bp   = int((df.RestingBP == 0).sum())
disease_rate_zero_chol    = round(float(df[df.Cholesterol == 0]["HeartDisease"].mean() * 100), 2)
disease_rate_nonzero_chol = round(float(df[df.Cholesterol != 0]["HeartDisease"].mean() * 100), 2)

# Exact 2x2 counts of (Cholesterol==0 yes/no) x (disease yes/no)
zero_chol_disease = int(((df.Cholesterol == 0) & (df.HeartDisease == 1)).sum())
zero_chol_healthy = int(((df.Cholesterol == 0) & (df.HeartDisease == 0)).sum())
nonzero_chol_disease = int(((df.Cholesterol != 0) & (df.HeartDisease == 1)).sum())
nonzero_chol_healthy = int(((df.Cholesterol != 0) & (df.HeartDisease == 0)).sum())

# Cholesterol before/after histogram (using 0 and non-zero separately)
chol_nonzero = df[df.Cholesterol != 0].copy()
chol_nonzero_min = float(chol_nonzero["Cholesterol"].min())
chol_nonzero_max = float(chol_nonzero["Cholesterol"].max())
chol_edges_nz = np.linspace(chol_nonzero_min, chol_nonzero_max, 21)
chol_nz_h0, _ = np.histogram(chol_nonzero[chol_nonzero.HeartDisease == 0]["Cholesterol"], bins=chol_edges_nz)
chol_nz_h1, _ = np.histogram(chol_nonzero[chol_nonzero.HeartDisease == 1]["Cholesterol"], bins=chol_edges_nz)

# describe() stats
desc = df.describe().T.round(4)

eda = {
    "class_counts": {"healthy": int(class_counts.get(0, 0)), "disease": int(class_counts.get(1, 0))},
    "num_histograms": num_histograms,
    "cat_counts": cat_counts_dict,
    "corr_matrix": {
        "columns": corr.columns.tolist(),
        "data": corr.values.tolist(),
    },
    "data_quality": {
        "total_rows": int(len(df)),
        "missing_values": int(df.isna().sum().sum()),
        "duplicates": int(df.duplicated().sum()),
        "zero_cholesterol_rows": zero_chol,
        "zero_restingbp_rows": zero_bp,
        "disease_rate_zero_cholesterol_pct": disease_rate_zero_chol,
        "disease_rate_nonzero_cholesterol_pct": disease_rate_nonzero_chol,
        "cholesterol_zero_x_disease": {
            "zero_chol_disease": zero_chol_disease,
            "zero_chol_healthy": zero_chol_healthy,
            "nonzero_chol_disease": nonzero_chol_disease,
            "nonzero_chol_healthy": nonzero_chol_healthy,
            "total_zero_chol": zero_chol,
            "total_nonzero_chol": int(len(df) - zero_chol),
        },
        "cholesterol_all_hist": num_histograms["Cholesterol"],
        "cholesterol_nonzero_hist": {
            "edges": [round(float(e), 4) for e in chol_edges_nz],
            "healthy": chol_nz_h0.tolist(),
            "disease": chol_nz_h1.tolist(),
        },
    },
    "describe": {
        col: {k: round(float(v), 4) for k, v in desc.loc[col].to_dict().items()}
        for col in desc.index
    },
}
jdump(safe(eda), OUT / "eda.json")

# ── 3. results.json ───────────────────────────────────────────────────────────
print("→ results.json")

results = {}
for model in MODELS:
    sub = raw[raw.model == model]
    per_seed = []
    for _, row in sub.iterrows():
        d = {k: (None if (isinstance(row[k], float) and np.isnan(row[k])) else _cast(row[k]))
             for k in ["seed", "model", "cv_acc"] + METRICS + ["TN", "FP", "FN", "TP"]}
        per_seed.append(d)

    # Pooled confusion matrix
    pool = sub[["TN", "FP", "FN", "TP"]].sum()

    # Per-seed confusion matrices
    per_seed_cm = []
    for _, row in sub.iterrows():
        per_seed_cm.append({
            "seed": int(row["seed"]),
            "TN": int(row["TN"]), "FP": int(row["FP"]),
            "FN": int(row["FN"]), "TP": int(row["TP"]),
        })

    stats = {}
    for m in METRICS + ["cv_acc"]:
        col = sub[m]
        stats[m] = {
            "mean": round(float(col.mean()), 6) if not col.isna().all() else None,
            "std":  round(float(col.std()),  6) if not col.isna().all() else None,
        }

    results[model] = {
        "stats": stats,
        "per_seed": per_seed,
        "confusion_pooled": {"TN": int(pool.TN), "FP": int(pool.FP), "FN": int(pool.FN), "TP": int(pool.TP)},
        "confusion_per_seed": per_seed_cm,
    }

jdump(safe(results), OUT / "results.json")

# ── 4. comparison.json ────────────────────────────────────────────────────────
print("→ comparison.json")

from paper_results import PAPER

comp_rows = []
for model in MODELS:
    sub = raw[raw.model == model]
    paper_vals = PAPER[model]
    for i, metric in enumerate(METRICS):
        pv  = paper_vals[i]
        my  = round(float(sub[metric].mean()), 6)
        std = round(float(sub[metric].std()),  6)
        diff = round(my - pv, 6)
        z    = round(diff / std, 4) if std > 0 else None
        abs_diff = abs(diff)
        if abs_diff <= std:
            verdict = "within noise"
        elif diff > 0:
            verdict = "higher"
        else:
            verdict = "lower"
        comp_rows.append({
            "model": model, "metric": metric,
            "paper": pv, "mine": my, "std": std,
            "diff": diff, "z": z, "verdict": verdict,
        })

jdump(safe(comp_rows), OUT / "comparison.json")

# ── 5. params.json ────────────────────────────────────────────────────────────
print("→ params.json")

params_out = {}
for model in MODELS:
    sub = params_df[params_df.model == model]
    per_seed = []
    for _, row in sub.iterrows():
        d = {"seed": int(row["seed"]), "model": row["model"]}
        for col in params_df.columns:
            if col in ("seed", "model"):
                continue
            v = row[col]
            if isinstance(v, float) and np.isnan(v):
                continue
            d[col] = _cast(v)
        per_seed.append(d)
    params_out[model] = per_seed

jdump(safe(params_out), OUT / "params.json")

# ── 6. curves.json ────────────────────────────────────────────────────────────
print("→ curves.json")

curves = {}
for seed in SEEDS:
    csv_path = RH / f"dnn_curve_seed{seed}.csv"
    h = pd.read_csv(csv_path)
    # Find best params for this seed
    bp = params_df[(params_df.model == "DNN") & (params_df.seed == seed)].iloc[0]
    n_epochs = int(bp["epochs"]) if not np.isnan(bp["epochs"]) else len(h)
    curves[str(seed)] = {
        "note": ("Tuning phase only: trained on 80% of training set (20% held as validation). "
                 "These are NOT the final test results."),
        "best_config": {
            "batch": int(bp["batch"]) if not np.isnan(bp["batch"]) else None,
            "lr":    float(bp["lr"])  if not np.isnan(bp["lr"])    else None,
            "epochs": n_epochs,
        },
        "epochs": list(range(1, len(h) + 1)),
        "loss":          [round(float(v), 6) for v in h["loss"]],
        "val_loss":      [round(float(v), 6) for v in h["val_loss"]],
        "accuracy":      [round(float(v), 6) for v in h["accuracy"]],
        "val_accuracy":  [round(float(v), 6) for v in h["val_accuracy"]],
    }

jdump(safe(curves), OUT / "curves.json")

# ── 7. assumptions.json ───────────────────────────────────────────────────────
print("→ assumptions.json")

assumptions = [
    {"id": "scoring",      "source": "assumption", "text": "Grid-search scoring metric is accuracy. The paper does not specify it explicitly."},
    {"id": "dnn_widths",   "source": "assumption", "text": "DNN hidden layer widths are 64-32-16. The paper mentions '3 hidden layers' without specifying sizes."},
    {"id": "nb_grid",      "source": "assumption", "text": "Naïve Bayes var_smoothing grid is [1e-9, 1e-8, 1e-7]. The paper says 'smoothing parameters' without values."},
    {"id": "dnn_val",      "source": "assumption", "text": "DNN is tuned on a 20% validation split of the training set, with config selected by last-epoch validation accuracy (no early stopping). The paper says 'validation split' without further detail."},
    {"id": "zeros_kept",   "source": "paper",      "text": "Zero values in Cholesterol (172 rows) and RestingBP (1 row) are kept as-is to match the paper-faithful run."},
    {"id": "split",        "source": "paper",      "text": "80:20 stratified train-test split, 5-fold stratified cross-validation."},
    {"id": "dt_grid",      "source": "paper",      "text": "Decision Tree grid: max_depth ∈ {3,5,7,None}, min_samples_split ∈ {2,5,10}."},
    {"id": "rf_grid",      "source": "paper",      "text": "Random Forest grid: n_estimators ∈ {100,200,300}, max_features ∈ {sqrt, log2}."},
    {"id": "svm_grid",     "source": "paper",      "text": "SVM grid: C ∈ {0.1,1,10}, kernel ∈ {linear, rbf}."},
    {"id": "lr_grid",      "source": "paper",      "text": "Logistic Regression grid: solver ∈ {liblinear, saga}, C ∈ {0.1,1,10}."},
    {"id": "dnn_grid",     "source": "paper",      "text": "DNN grid: batch ∈ {16,32}, lr ∈ {0.001,0.01}, epochs ∈ {20,50}. Architecture: Adam optimizer, binary cross-entropy loss."},
]

jdump(assumptions, OUT / "assumptions.json")

# ── 8. variants.json ──────────────────────────────────────────────────────────
print("→ variants.json")

# Check if results_variants/summary.json exists
var_summary_file = RV / "summary.json"
raw_b_file = RV / "raw_variant_b.csv"
raw_a_file = RV / "raw_variant_a.csv"

variants_out = {}
if var_summary_file.exists():
    with open(var_summary_file, "r", encoding="utf-8") as f:
        variants_out = json.load(f)
else:
    # Build default structure if summary.json has not been generated yet
    n_zero_chol = int((df["Cholesterol"] == 0).sum())
    n_zero_bp = int((df["RestingBP"] == 0).sum())
    disease_rate_zero_chol = round(float(df[df["Cholesterol"] == 0]["HeartDisease"].mean() * 100), 1)
    variants_out = {
        "variant_a_dnn_early_stopping": {
            "title": "Variant A: DNN Early Stopping & Loss-Based Tuning",
            "description": "Applies tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True) and selects hyperparameter config by minimum validation loss instead of final-epoch accuracy.",
            "hypothesis": "Designed to prevent late-epoch validation loss divergence observed during unconstrained training, stabilizing cross-seed variance.",
            "status": "not_run"
        },
        "variant_b_median_imputation": {
            "title": "Variant B: Median Imputation of Zero Measurements",
            "description": f"Replaces zero values in Cholesterol ({n_zero_chol} rows) and RestingBP ({n_zero_bp} row) with NaN and applies SimpleImputer(strategy='median') strictly fit inside training folds to prevent data leakage.",
            "hypothesis": f"Removes the artificial proxy shortcut where models exploit Cholesterol==0 as an indicator of {disease_rate_zero_chol}% disease prevalence, measuring true physiological generalization.",
            "status": "executed" if raw_b_file.exists() else "not_run"
        }
    }

# Compute deltas of Variant B versus baseline from raw.csv and raw_variant_b.csv
if raw_b_file.exists():
    df_vb = pd.read_csv(raw_b_file)
    deltas_b = {}
    models_b_dict = variants_out.get("variant_b_median_imputation", {}).get("models", {})
    for m in ["NB", "DT", "RF", "SVM", "LR"]:
        base_sub = raw[raw.model == m]
        vb_sub = df_vb[df_vb.model == m]

        base_acc = float(base_sub["accuracy"].mean())
        vb_acc = float(vb_sub["accuracy"].mean())
        delta_acc_pp = round((vb_acc - base_acc) * 100, 2)

        base_auc = float(base_sub["auc"].mean())
        vb_auc = float(vb_sub["auc"].mean())
        delta_auc_pp = round((vb_auc - base_auc) * 100, 2)

        deltas_b[m] = {
            "baseline_accuracy": round(base_acc, 4),
            "variant_b_accuracy": round(vb_acc, 4),
            "delta_accuracy_pp": delta_acc_pp,
            "baseline_auc": round(base_auc, 4),
            "variant_b_auc": round(vb_auc, 4),
            "delta_auc_pp": delta_auc_pp,
        }

        # Ensure summary model stats are populated
        if m not in models_b_dict:
            models_b_dict[m] = {
                met: {"mean": round(float(vb_sub[met].mean()), 4), "std": round(float(vb_sub[met].std()), 4)}
                for met in METRICS
            }
    if "variant_b_median_imputation" in variants_out:
        variants_out["variant_b_median_imputation"]["models"] = models_b_dict
        variants_out["variant_b_median_imputation"]["deltas_vs_baseline"] = deltas_b

# Check if Variant A exists
if raw_a_file.exists():
    df_va = pd.read_csv(raw_a_file)
    base_sub = raw[raw.model == "DNN"]
    va_sub = df_va[df_va.model == "DNN"]
    base_acc = float(base_sub["accuracy"].mean())
    va_acc = float(va_sub["accuracy"].mean())
    base_auc = float(base_sub["auc"].mean())
    va_auc = float(va_sub["auc"].mean())

    if "variant_a_dnn_early_stopping" in variants_out:
        variants_out["variant_a_dnn_early_stopping"]["status"] = "executed"
        variants_out["variant_a_dnn_early_stopping"]["deltas_vs_baseline"] = {
            "DNN": {
                "baseline_accuracy": round(base_acc, 4),
                "variant_a_accuracy": round(va_acc, 4),
                "delta_accuracy_pp": round((va_acc - base_acc) * 100, 2),
                "baseline_auc": round(base_auc, 4),
                "variant_a_auc": round(va_auc, 4),
                "delta_auc_pp": round((va_auc - base_auc) * 100, 2),
            }
        }
        variants_out["variant_a_dnn_early_stopping"]["models"] = {
            "DNN": {
                met: {"mean": round(float(va_sub[met].mean()), 4), "std": round(float(va_sub[met].std()), 4)}
                for met in METRICS
            }
        }

jdump(safe(variants_out), OUT / "variants.json")

print("\nAll JSON files written to", OUT)
