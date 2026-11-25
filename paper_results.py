"""
paper_results.py – single source of truth for the paper's reported numbers.
Simanjuntak, Robet & Hoki (2025), JAIC 9(6):3405-3409
"A Comparative Study of ML and DL Models for Heart Disease Classification"
"""

METRICS = ["accuracy", "precision0", "precision1", "recall0", "recall1", "f1_0", "f1_1", "auc"]

PAPER = {
    "NB":  [.86, .80, .93, .91, .88, .85, .88, .92],
    "DT":  [.79, .71, .88, .86, .75, .78, .81, .80],
    "RF":  [.88, .84, .90, .87, .88, .85, .89, .94],
    "SVM": [.89, .86, .91, .88, .90, .87, .91, .93],
    "LR":  [.86, .80, .90, .87, .84, .83, .87, .92],
    "DNN": [.89, .83, .93, .91, .87, .87, .90, .94],
}
