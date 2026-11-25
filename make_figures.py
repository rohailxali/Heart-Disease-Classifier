"""
make_figures.py – generates publication figures for the replication study.
Figures saved to figs/. Run from any working directory.
"""
import textwrap
from pathlib import Path
import numpy as np, pandas as pd, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from paper_results import PAPER  # single source of truth

_HERE = Path(__file__).resolve().parent
FIGS = _HERE / "figs"
FIGS.mkdir(exist_ok=True)
RAW = _HERE / "results_heart" / "raw.csv"

raw = pd.read_csv(RAW)
order = ["NB", "DT", "RF", "SVM", "LR", "DNN"]
paper = {"accuracy": [PAPER[m][0] for m in order], "auc": [PAPER[m][7] for m in order]}

# 1) paper vs replication -------------------------------------------------------
fig, ax = plt.subplots(1, 2, figsize=(12, 5.0))
for a, met, title in zip(ax, ["accuracy", "auc"], ["Accuracy", "ROC-AUC"]):
    mu = raw.groupby("model")[met].mean().loc[order].values
    sd = raw.groupby("model")[met].std().loc[order].values
    x = np.arange(6); w = 0.38
    a.bar(x - w/2, paper[met], w, label="Paper (single run)", color="#9bb7d4")
    a.bar(x + w/2, mu, w, yerr=sd, capsize=3,
          label="Replication (mean ± SD, 5 seeds)", color="#e8975b")
    a.set_xticks(x); a.set_xticklabels(order)
    a.set_ylim(0.70, 1.0)
    a.set_title(title)
    a.grid(axis="y", alpha=.3)
    # Note about truncated axis
    a.annotate("⚠ axis starts at 0.70", xy=(0.02, 0.02), xycoords="axes fraction",
                fontsize=7, color="grey", style="italic")
# Legend above both subplots, outside plot area
handles, labels = ax[0].get_legend_handles_labels()
fig.legend(handles, labels, loc="upper center", ncol=2, bbox_to_anchor=(0.5, 1.02),
           fontsize=9, frameon=True)
plt.tight_layout(rect=[0, 0, 1, 0.97])
plt.savefig(FIGS / "paper_vs_mine.png", dpi=170, bbox_inches="tight"); plt.close()

# 2) pooled confusion matrices --------------------------------------------------
n_seeds = raw["seed"].nunique()
n_test  = raw.groupby("seed").first().shape[0]
# derive test size from data
seed_counts = raw[raw.model == order[0]][["seed", "TN", "FP", "FN", "TP"]]
total_preds = int((seed_counts["TN"] + seed_counts["FP"] + seed_counts["FN"] + seed_counts["TP"]).iloc[0])
title_str = (f"Confusion matrices, summed over {n_seeds} seeds "
             f"({n_seeds} × {total_preds} = {n_seeds * total_preds} test predictions)")

fig, ax = plt.subplots(2, 3, figsize=(11, 6.5))
for a, m in zip(ax.ravel(), order):
    g = raw[raw.model == m][["TN", "FP", "FN", "TP"]].sum()
    cm = np.array([[g.TN, g.FP], [g.FN, g.TP]])
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", cbar=False, ax=a,
                xticklabels=["Pred 0", "Pred 1"], yticklabels=["Actual 0", "Actual 1"])
    a.set_title(m)
plt.suptitle(title_str, y=1.0)
plt.tight_layout(); plt.savefig(FIGS / "confusion_all.png", dpi=170); plt.close()

# 3) accuracy spread ------------------------------------------------------------
plt.figure(figsize=(7, 4))
sns.boxplot(data=raw, x="model", y="accuracy", order=order, color="#cfe0f2")
sns.stripplot(data=raw, x="model", y="accuracy", order=order, color="#c0392b", size=5)
plt.grid(axis="y", alpha=.3); plt.title("Test accuracy across 5 seeds")
plt.tight_layout(); plt.savefig(FIGS / "acc_spread.png", dpi=170); plt.close()

# 4) DNN curves -----------------------------------------------------------------
fig, axes = plt.subplots(1, 5, figsize=(16, 3.3), sharey=True)
for a, s in zip(axes, [42, 43, 44, 45, 46]):
    h = pd.read_csv(_HERE / "results_heart" / f"dnn_curve_seed{s}.csv")
    a.plot(h["loss"], label="train loss"); a.plot(h["val_loss"], label="val loss")
    a.set_title(f"seed {s}"); a.set_xlabel("epoch"); a.grid(alpha=.3)
axes[0].set_ylabel("binary cross-entropy"); axes[0].legend(fontsize=8)
plt.tight_layout(); plt.savefig(FIGS / "dnn_curves.png", dpi=170); plt.close()

# 5) workflow diagram -----------------------------------------------------------
steps = [
    "1. Load heart.csv\n(918 rows × 12 cols)",
    "2. Clean\n(drop missing / duplicates)",
    "3. Stratified split\n80 : 20 (train / test)",
    "4. Preprocess (in pipeline)\nStandardScaler + One-Hot",
    "5. Tune on train set\n5-fold CV grid search\n(DNN: validation split)",
    "6. Refit best model\non full train set",
    "7. Evaluate on test set\nAcc, P, R, F1, AUC, CM",
    "8. Repeat for 5 seeds\nmean ± SD,\ncompare to paper",   # wrapped
]
fig, ax_f = plt.subplots(figsize=(12.5, 4.5)); ax_f.axis("off")
ax_f.set_xlim(0, 12.5); ax_f.set_ylim(0.4, 4.6)
w, h_box, gap = 2.5, 1.3, 0.4

def pos(i):
    r, c = divmod(i, 4)
    if r == 1: c = 3 - c
    return 0.3 + c * (w + gap), 2.9 - r * 2.1

for i, t in enumerate(steps):
    x, y = pos(i)
    ax_f.add_patch(FancyBboxPatch((x, y), w, h_box, boxstyle="round,pad=0.04",
                                  fc="#e8f1fb", ec="#2c5d8f", lw=1.3))
    ax_f.text(x + w / 2, y + h_box / 2, t, ha="center", va="center",
              fontsize=8.5, wrap=True,
              multialignment="center")

for i in range(7):
    (x1, y1), (x2, y2) = pos(i), pos(i + 1)
    if i == 3:
        a_coords = ((x1 + w / 2, y1 - 0.06), (x2 + w / 2, y2 + h_box + 0.06))
    elif i < 3:
        a_coords = ((x1 + w + 0.05, y1 + h_box / 2), (x2 - 0.05, y2 + h_box / 2))
    else:
        a_coords = ((x1 - 0.05, y1 + h_box / 2), (x2 + w + 0.05, y2 + h_box / 2))
    ax_f.add_patch(FancyArrowPatch(*a_coords, arrowstyle="-|>", mutation_scale=14,
                                   color="#2c5d8f", lw=1.3))

plt.savefig(FIGS / "flow.png", dpi=170, bbox_inches="tight", pad_inches=0.15); plt.close()
print("Figures saved in", FIGS)
