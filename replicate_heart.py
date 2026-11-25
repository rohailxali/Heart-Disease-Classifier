"""
Replication of Simanjuntak, Robet & Hoki (2025), JAIC 9(6):3405-3409
"A Comparative Study of ML and DL Models for Heart Disease Classification"
Own implementation. 80:20 stratified hold-out, 5-fold stratified CV grid search (as per paper),
models: NB, DT, RF, SVM, LR, DNN. Metrics: acc, per-class P/R/F1, AUC.
"""
import os, itertools, warnings
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.naive_bayes import GaussianNB
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, precision_recall_fscore_support,
                             roc_auc_score, confusion_matrix)
import tensorflow as tf

warnings.filterwarnings("ignore")

# ---------------- config ----------------
_HERE = Path(__file__).resolve().parent
DATA = _HERE / "heart.csv"
SEEDS = [42, 43, 44, 45, 46]
OUT = _HERE / "results_heart"
OUT.mkdir(exist_ok=True)

NUM = ["Age", "RestingBP", "Cholesterol", "MaxHR", "Oldpeak"]
CAT = ["Sex", "ChestPainType", "RestingECG", "ExerciseAngina", "ST_Slope"]
# FastingBS is already 0/1 -> passthrough

# ---------------- paper's Table 2 ----------------
from paper_results import METRICS, PAPER

# ---------------- paper's grids (Sec. II-F) ----------------
def sk_models(seed):
    return {
     "NB":  (GaussianNB(), {"clf__var_smoothing": [1e-9, 1e-8, 1e-7]}),   # "smoothing parameters": my grid
     "DT":  (DecisionTreeClassifier(random_state=seed),
             {"clf__max_depth": [3, 5, 7, None], "clf__min_samples_split": [2, 5, 10]}),
     "RF":  (RandomForestClassifier(random_state=seed, n_jobs=-1),
             {"clf__n_estimators": [100, 200, 300], "clf__max_features": ["sqrt", "log2"]}),
     "SVM": (SVC(probability=True, random_state=seed),
             {"clf__C": [0.1, 1, 10], "clf__kernel": ["linear", "rbf"]}),
     "LR":  (LogisticRegression(max_iter=5000, random_state=seed),
             {"clf__solver": ["liblinear", "saga"], "clf__C": [0.1, 1, 10]}),
    }

DNN_GRID = list(itertools.product([16, 32], [0.001, 0.01], [20, 50]))  # batch, lr, epochs

def make_pre():
    return ColumnTransformer([("num", StandardScaler(), NUM),
                              ("cat", OneHotEncoder(handle_unknown="ignore"), CAT)],
                             remainder="passthrough", sparse_threshold=0.0)

def evaluate(y, pred, score):
    p, r, f, _ = precision_recall_fscore_support(y, pred, labels=[0, 1], zero_division=0)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    return dict(accuracy=accuracy_score(y, pred), precision0=p[0], precision1=p[1],
                recall0=r[0], recall1=r[1], f1_0=f[0], f1_1=f[1],
                auc=roc_auc_score(y, score), TN=tn, FP=fp, FN=fn, TP=tp)

# ---------------- DNN ----------------
def build_dnn(n_in, lr, seed):
    tf.keras.utils.set_random_seed(seed)
    m = tf.keras.Sequential([                      # ASSUMPTION: paper gives 3 hidden layers, no widths -> 64-32-16
        tf.keras.layers.Input(shape=(n_in,)),
        tf.keras.layers.Dense(64, activation="relu"),
        tf.keras.layers.Dense(32, activation="relu"),
        tf.keras.layers.Dense(16, activation="relu"),
        tf.keras.layers.Dense(1, activation="sigmoid")])
    m.compile(optimizer=tf.keras.optimizers.Adam(lr), loss="binary_crossentropy", metrics=["accuracy"])
    return m

def run_dnn(Xtr, ytr, Xte, yte, seed):
    # tuning on a validation split of the training set (paper: "using a validation split")
    Xa, Xv, ya, yv = train_test_split(Xtr, ytr, test_size=0.2, stratify=ytr, random_state=seed)
    pre_a = make_pre().fit(Xa)
    Xa_, Xv_ = pre_a.transform(Xa).astype("float32"), pre_a.transform(Xv).astype("float32")
    best, best_acc, best_hist = None, -1, None
    for bs, lr, ep in DNN_GRID:
        m = build_dnn(Xa_.shape[1], lr, seed)
        h = m.fit(Xa_, ya, validation_data=(Xv_, yv), batch_size=bs, epochs=ep, verbose=0)
        va = h.history["val_accuracy"][-1]
        if va > best_acc:
            best, best_acc, best_hist = (bs, lr, ep), va, h.history
    pd.DataFrame(best_hist).to_csv(str(OUT / f"dnn_curve_seed{seed}.csv"), index=False)  # loss/val_loss for plots
    # refit on full training set with best config, evaluate on test
    pre = make_pre().fit(Xtr)
    Xtr_, Xte_ = pre.transform(Xtr).astype("float32"), pre.transform(Xte).astype("float32")
    bs, lr, ep = best
    m = build_dnn(Xtr_.shape[1], lr, seed)
    m.fit(Xtr_, ytr, batch_size=bs, epochs=ep, verbose=0)
    proba = m.predict(Xte_, verbose=0).ravel()
    return evaluate(yte, (proba >= 0.5).astype(int), proba), dict(batch=bs, lr=lr, epochs=ep)

# ---------------- main ----------------
if __name__ == "__main__":
    df = pd.read_csv(str(DATA))
    print("raw shape:", df.shape, "| missing:", int(df.isna().sum().sum()), "| duplicates:", int(df.duplicated().sum()))
    print("zeros -> Cholesterol:", int((df.Cholesterol == 0).sum()), "| RestingBP:", int((df.RestingBP == 0).sum()),
          "(hidden missing values; kept as in the paper)")
    df = df.dropna().drop_duplicates().reset_index(drop=True)      # paper: remove missing/duplicates
    print("class counts:\n", df.HeartDisease.value_counts().to_string())
    X, y = df.drop(columns="HeartDisease"), df["HeartDisease"].values

    rows, params = [], []
    for seed in SEEDS:
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=seed)
        print(f"\n=== seed {seed} | train {len(ytr)} | test {len(yte)} ===", flush=True)
        cv = StratifiedKFold(5, shuffle=True, random_state=seed)
        for name, (clf, grid) in sk_models(seed).items():
            pipe = Pipeline([("pre", make_pre()), ("clf", clf)])
            gs = GridSearchCV(pipe, grid, cv=cv, scoring="accuracy", n_jobs=-1).fit(Xtr, ytr)  # ASSUMPTION: accuracy
            pred = gs.predict(Xte)
            sc = gs.decision_function(Xte) if hasattr(gs, "decision_function") else gs.predict_proba(Xte)[:, 1]
            met = evaluate(yte, pred, sc)
            rows.append(dict(seed=seed, model=name, cv_acc=gs.best_score_, **met))
            params.append(dict(seed=seed, model=name, **{k.replace("clf__", ""): v for k, v in gs.best_params_.items()}))
            print(f"{name:4s} acc={met['accuracy']:.3f} auc={met['auc']:.3f} cv={gs.best_score_:.3f} {gs.best_params_}", flush=True)
        met, bp = run_dnn(Xtr, ytr, Xte, yte, seed)
        rows.append(dict(seed=seed, model="DNN", cv_acc=np.nan, **met)); params.append(dict(seed=seed, model="DNN", **bp))
        print(f"DNN  acc={met['accuracy']:.3f} auc={met['auc']:.3f} {bp}", flush=True)
        pd.DataFrame(rows).to_csv(str(OUT / "raw.csv"), index=False)       # saved per seed
        pd.DataFrame(params).to_csv(str(OUT / "best_params.csv"), index=False)

    raw = pd.DataFrame(rows)
    raw.groupby("model")[METRICS + ["cv_acc"]].agg(["mean", "std"]).round(4).to_csv(str(OUT / "summary.csv"))

    comp = []
    for model, vals in PAPER.items():
        g = raw[raw.model == model]
        for metric, pv in zip(METRICS, vals):
            comp.append(dict(model=model, metric=metric, paper=pv, mine=round(g[metric].mean(), 4),
                             std=round(g[metric].std(), 4), diff=round(g[metric].mean() - pv, 4)))
    comp = pd.DataFrame(comp); comp.to_csv(str(OUT / "comparison.csv"), index=False)
    print("\n", comp.pivot(index="model", columns="metric", values="diff").round(3).to_string())