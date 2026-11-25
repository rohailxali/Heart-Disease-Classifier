// Shared formatting utilities
export const fmtPct = (v: number, dec = 1) => `${(v * 100).toFixed(dec)}%`
export const fmtAUC = (v: number) => v.toFixed(3)
export const fmtNum = (v: number, dec = 4) => v.toFixed(dec)
export const fmtPctPts = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(2)} pp`

export const MODELS = ['NB', 'DT', 'RF', 'SVM', 'LR', 'DNN'] as const
export const SEEDS = [42, 43, 44, 45, 46] as const

export const MODEL_LABELS: Record<string, string> = {
  NB: 'Naïve Bayes',
  DT: 'Decision Tree',
  RF: 'Random Forest',
  SVM: 'Support Vector Machine',
  LR: 'Logistic Regression',
  DNN: 'Deep Neural Network',
}

export const METRIC_LABELS: Record<string, string> = {
  accuracy:   'Accuracy',
  precision0: 'Precision (Healthy)',
  precision1: 'Precision (Disease)',
  recall0:    'Recall (Healthy)',
  recall1:    'Recall (Disease)',
  f1_0:       'F1 (Healthy)',
  f1_1:       'F1 (Disease)',
  auc:        'ROC-AUC',
  cv_acc:     'CV Accuracy',
}

export const COLORS = {
  teal:      '#2DD4BF',
  rose:      '#FB7185',
  slateBlue: '#7FA6D6',
  amber:     '#F59E0B',
  success:   '#34D399',
  muted:     '#8EA0BC',
}
