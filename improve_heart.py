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

def run_variant_b(df):
    print("Running Variant B: Median Imputation of Zero Cholesterol and RestingBP...")
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
    raw_b_path = OUT_VAR / "raw_variant_b.csv"
    df_vb.to_csv(raw_b_path, index=False)
    print(f"Saved {raw_b_path}")
    return df_vb

def run_variant_a(df):
    """Run Variant A if TensorFlow is available, otherwise return None."""
    try:
        import tensorflow as tf
        print(f"TensorFlow {tf.__version__} detected. Running Variant A (Early Stopping)...")
    except ImportError:
        print("TensorFlow not installed. Skipping Variant A execution.")
        return None

    X = df.drop(columns="HeartDisease")
    y = df["HeartDisease"].values

    rows_var_a = []
    # Grid of hyperparameters to tune
    batch_sizes = [16, 32]
    learning_rates = [0.001, 0.01]
    epochs_list = [20, 50]

    for seed in SEEDS:
        Xtr_full, Xte, ytr_full, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=seed)
        # Inner validation split (20% of training set)
        Xtr, Xval, ytr, yval = train_test_split(Xtr_full, ytr_full, test_size=0.2, stratify=ytr_full, random_state=seed)

        num_pipe = Pipeline([("scaler", StandardScaler())])
        pre = ColumnTransformer([
            ("num", num_pipe, NUM),
            ("cat", OneHotEncoder(handle_unknown="ignore"), CAT)
        ], remainder="passthrough", sparse_threshold=0.0).fit(Xtr)

        Xtr_ = pre.transform(Xtr).astype("float32")
        Xval_ = pre.transform(Xval).astype("float32")
        Xte_ = pre.transform(Xte).astype("float32")

        best_val_loss = float("inf")
        best_cfg = None

        for batch in batch_sizes:
            for lr in learning_rates:
                for epochs in epochs_list:
                    tf.keras.utils.set_random_seed(seed)
                    model = tf.keras.Sequential([
                        tf.keras.layers.Input(shape=(Xtr_.shape[1],)),
                        tf.keras.layers.Dense(64, activation="relu"),
                        tf.keras.layers.Dense(32, activation="relu"),
                        tf.keras.layers.Dense(16, activation="relu"),
                        tf.keras.layers.Dense(1, activation="sigmoid")
                    ])
                    model.compile(optimizer=tf.keras.optimizers.Adam(lr), loss="binary_crossentropy", metrics=["accuracy"])
                    es = tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True)
                    history = model.fit(Xtr_, ytr, validation_data=(Xval_, yval),
                                        batch_size=batch, epochs=epochs, callbacks=[es], verbose=0)
                    min_val_loss = min(history.history["val_loss"])
                    if min_val_loss < best_val_loss:
                        best_val_loss = min_val_loss
                        best_cfg = (batch, lr, epochs)

        # Train on full Xtr_full with best_cfg and early stopping on Xval
        batch, lr, epochs = best_cfg
        tf.keras.utils.set_random_seed(seed)
        final_model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(Xtr_.shape[1],)),
            tf.keras.layers.Dense(64, activation="relu"),
            tf.keras.layers.Dense(32, activation="relu"),
            tf.keras.layers.Dense(16, activation="relu"),
            tf.keras.layers.Dense(1, activation="sigmoid")
        ])
        final_model.compile(optimizer=tf.keras.optimizers.Adam(lr), loss="binary_crossentropy", metrics=["accuracy"])
        es = tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True)
        final_model.fit(Xtr_, ytr, validation_data=(Xval_, yval),
                        batch_size=batch, epochs=epochs, callbacks=[es], verbose=0)

        proba = final_model.predict(Xte_, verbose=0).ravel()
        pred = (proba >= 0.5).astype(int)
        met = evaluate(yte, pred, proba)
        rows_var_a.append(dict(seed=seed, model="DNN", cv_acc=None, **met))
        print(f"Variant A | Seed {seed} | DNN: acc={met['accuracy']:.4f}, auc={met['auc']:.4f}")

    df_va = pd.DataFrame(rows_var_a)
    raw_a_path = OUT_VAR / "raw_variant_a.csv"
    df_va.to_csv(raw_a_path, index=False)
    print(f"Saved {raw_a_path}")
    return df_va

def main():
    print("Loading heart.csv...")
    df = pd.read_csv(DATA)
    df = df.dropna().drop_duplicates().reset_index(drop=True)

    n_zero_chol = int((df["Cholesterol"] == 0).sum())
    n_zero_bp = int((df["RestingBP"] == 0).sum())
    disease_rate_zero_chol = round(float(df[df["Cholesterol"] == 0]["HeartDisease"].mean() * 100), 1)

    # Variant B execution or load existing
    raw_b_path = OUT_VAR / "raw_variant_b.csv"
    if raw_b_path.exists():
        print(f"Using existing {raw_b_path}")
        df_vb = pd.read_csv(raw_b_path)
    else:
        df_vb = run_variant_b(df)

    # Variant A execution
    df_va = run_variant_a(df)

    metrics = ["accuracy", "precision0", "precision1", "recall0", "recall1", "f1_0", "f1_1", "auc"]
    summary_b = {}
    for m in ["NB", "DT", "RF", "SVM", "LR"]:
        sub = df_vb[df_vb.model == m]
        summary_b[m] = {
            met: {"mean": round(float(sub[met].mean()), 4), "std": round(float(sub[met].std()), 4)}
            for met in metrics
        }

    variant_a_info = {
        "title": "Variant A: DNN Early Stopping & Loss-Based Tuning",
        "description": "Applies tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True) and selects hyperparameter config by minimum validation loss instead of final-epoch accuracy.",
        "hypothesis": "Designed to prevent late-epoch validation loss divergence observed during unconstrained training, stabilizing cross-seed variance.",
        "status": "executed" if df_va is not None else "not_run"
    }
    if df_va is not None:
        sub_a = df_va[df_va.model == "DNN"]
        variant_a_info["models"] = {
            "DNN": {
                met: {"mean": round(float(sub_a[met].mean()), 4), "std": round(float(sub_a[met].std()), 4)}
                for met in metrics
            }
        }

    variant_b_info = {
        "title": "Variant B: Median Imputation of Zero Measurements",
        "description": (
            f"Replaces zero values in Cholesterol ({n_zero_chol} rows) and RestingBP ({n_zero_bp} row) "
            "with NaN and applies SimpleImputer(strategy='median') strictly fit inside training folds "
            "to prevent data leakage."
        ),
        "hypothesis": (
            f"Removes the artificial proxy shortcut where models exploit Cholesterol==0 as an indicator of "
            f"{disease_rate_zero_chol}% disease prevalence, measuring true physiological generalization."
        ),
        "models": summary_b,
        "status": "executed"
    }

    summary_data = {
        "variant_a_dnn_early_stopping": variant_a_info,
        "variant_b_median_imputation": variant_b_info
    }

    # Write summary.json to results_variants/summary.json (export_results.py will publish to variants.json)
    summary_path = OUT_VAR / "summary.json"
    with open(summary_path, "w") as f:
        json.dump(summary_data, f, indent=2)
    print(f"Saved {summary_path}")

if __name__ == "__main__":
    main()
