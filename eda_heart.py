from pathlib import Path
import pandas as pd, matplotlib.pyplot as plt, seaborn as sns

_HERE = Path(__file__).resolve().parent
df = pd.read_csv(_HERE / "heart.csv")
print(df.shape, df.dtypes, df.describe().T, sep="\n")
print("missing:", df.isna().sum().sum(), "| duplicates:", df.duplicated().sum())
print("zero Cholesterol:", (df.Cholesterol == 0).sum(), "| zero RestingBP:", (df.RestingBP == 0).sum())
print(df.HeartDisease.value_counts(), df.HeartDisease.value_counts(normalize=True).round(3))

num = ["Age", "RestingBP", "Cholesterol", "MaxHR", "Oldpeak"]
fig, ax = plt.subplots(2, 3, figsize=(15, 8))
for a, c in zip(ax.ravel(), num):
    sns.histplot(data=df, x=c, hue="HeartDisease", kde=True, ax=a)
sns.countplot(data=df, x="ChestPainType", hue="HeartDisease", ax=ax[1, 2])
plt.tight_layout(); plt.savefig(_HERE / "eda_dist.png", dpi=150)

plt.figure(figsize=(8, 6))
sns.heatmap(df.select_dtypes("number").corr(), annot=True, fmt=".2f", cmap="coolwarm")
plt.tight_layout(); plt.savefig(_HERE / "eda_corr.png", dpi=150)
