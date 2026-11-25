import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Sparkles, Split, Sliders, Cpu, RefreshCw, CheckCircle2, RotateCw,
  Check
} from 'lucide-react'
import { useData } from '../useData'
import { Card, Badge } from '../components/Card'

interface StepDetail {
  id: number
  title: string
  subtitle: string
  icon: any
  summary: string
  details: string[]
  codeSnippet: string
  assumptionIds: string[]
}

const STEPS: StepDetail[] = [
  {
    id: 1,
    title: 'Load Dataset',
    subtitle: 'heart.csv (918 × 12)',
    icon: FileText,
    summary: 'Ingestion of the Kaggle Heart Failure Prediction dataset containing 918 patient observations and 11 clinical features + binary target.',
    details: [
      '11 input features: 5 continuous numeric, 5 categorical strings, 1 binary flag (FastingBS).',
      'Target column: HeartDisease (0 = Healthy, 1 = Heart Disease).',
      'Initial shape: 918 rows, 12 columns. Exactly 0 null/NA values in the raw CSV representation.',
    ],
    codeSnippet: 'df = pd.read_csv("heart.csv")',
    assumptionIds: [],
  },
  {
    id: 2,
    title: 'Clean & Validate',
    subtitle: 'Explicit vs Hidden Missingness',
    icon: Sparkles,
    summary: 'Drop formal nulls and duplicate rows, but explicitly preserve zero-coded missing values to maintain parity with the paper.',
    details: [
      'df.dropna().drop_duplicates(): drops 0 rows because dataset contains no literal NaN tokens or duplicates.',
      'Physiological anomalies: Cholesterol == 0 in 172 rows (18.7%) and RestingBP == 0 in 1 row.',
      'Paper fidelity: The published paper kept these zeros as valid values. To remain paper-faithful, our baseline replication does not impute or discard them.',
    ],
    codeSnippet: 'df = df.dropna().drop_duplicates().reset_index(drop=True)\n# 172 rows with Cholesterol=0 kept as in the paper',
    assumptionIds: ['zeros_kept'],
  },
  {
    id: 3,
    title: 'Stratified Split',
    subtitle: '80:20 Hold-out (734 : 184)',
    icon: Split,
    summary: 'Stratified random train-test partitioning preserving target class balance (55.3% disease) in both partitions.',
    details: [
      'Train split: 734 patients (approx 406 disease, 328 healthy).',
      'Held-out test split: exactly 184 patients (102 disease, 82 healthy).',
      'Each individual test patient represents 1 / 184 = 0.5435 percentage points of accuracy.',
    ],
    codeSnippet: 'Xtr, Xte, ytr, yte = train_test_split(\n    X, y, test_size=0.2, stratify=y, random_state=seed\n)',
    assumptionIds: ['split'],
  },
  {
    id: 4,
    title: 'Pipeline Preprocessing',
    subtitle: 'StandardScaler + OneHotEncoder',
    icon: Sliders,
    summary: 'Data preprocessing enclosed inside scikit-learn Pipelines to strictly prevent data leakage from test folds into training transformations.',
    details: [
      'StandardScaler applied to 5 numeric features: Age, RestingBP, Cholesterol, MaxHR, Oldpeak.',
      'OneHotEncoder(handle_unknown="ignore") applied to 5 categorical features: Sex, ChestPainType, RestingECG, ExerciseAngina, ST_Slope.',
      'FastingBS (already 0/1 binary) passed through unscaled.',
    ],
    codeSnippet: 'pre = ColumnTransformer([\n    ("num", StandardScaler(), NUM),\n    ("cat", OneHotEncoder(handle_unknown="ignore"), CAT)\n], remainder="passthrough", sparse_threshold=0.0)',
    assumptionIds: [],
  },
  {
    id: 5,
    title: 'Hyperparameter Tuning',
    subtitle: '5-Fold CV & Validation Split',
    icon: Cpu,
    summary: 'Exhaustive grid search across parameter spaces using 5-fold stratified cross-validation for ML models and a 20% validation split for DNN.',
    details: [
      'Scoring metric: Accuracy (paper does not state scoring criterion; assumed accuracy).',
      'Sklearn models: GaussianNB (var_smoothing), DecisionTree (max_depth, min_samples_split), RandomForest (n_estimators, max_features), SVM (C, kernel), LogisticRegression (C, solver).',
      'DNN tuning: 20% validation split of training set; grid over batch (16, 32), lr (0.001, 0.01), epochs (20, 50). Best config selected by last-epoch validation accuracy.',
    ],
    codeSnippet: 'gs = GridSearchCV(pipe, grid, cv=StratifiedKFold(5, shuffle=True, random_state=seed), scoring="accuracy")\n# DNN tuned on validation split with ReLU (64-32-16) + Sigmoid',
    assumptionIds: ['scoring', 'dnn_widths', 'nb_grid', 'dnn_val', 'dt_grid', 'rf_grid', 'svm_grid', 'lr_grid', 'dnn_grid'],
  },
  {
    id: 6,
    title: 'Refit Best Config',
    subtitle: 'Train on Full 734 Samples',
    icon: RefreshCw,
    summary: 'Retrain the optimal parameter configuration on the combined 734-sample training partition prior to test set scoring.',
    details: [
      'Sklearn Pipeline: automatically refits best parameters on full Xtr via GridSearchCV(refit=True).',
      'Keras DNN: instantiated with optimal (batch, lr, epochs) and fitted on full Xtr (734 samples) with random_state=seed.',
    ],
    codeSnippet: 'best_pipe.fit(Xtr, ytr)\n# DNN refitted on full Xtr with optimal batch/lr/epochs',
    assumptionIds: [],
  },
  {
    id: 7,
    title: 'Test Set Evaluation',
    subtitle: 'Comprehensive Metric Battery',
    icon: CheckCircle2,
    summary: 'Final objective evaluation on the untouched 184 held-out test patients.',
    details: [
      'Primary metrics: Accuracy, ROC-AUC score, per-class Precision, Recall, and F1-score (for both Healthy and Disease classes).',
      'Confusion matrix extracted: True Negatives (TN), False Positives (FP), False Negatives (FN), True Positives (TP).',
      'Probability calibration: predict_proba used for NB, RF, SVM, LR, DNN; decision_function for uncalibrated boundary when required.',
    ],
    codeSnippet: 'pred = model.predict(Xte)\nproba = model.predict_proba(Xte)[:, 1]\nmet = evaluate(yte, pred, proba)',
    assumptionIds: [],
  },
  {
    id: 8,
    title: '5-Seed Replication',
    subtitle: 'Seeds 42 to 46 Aggregation',
    icon: RotateCw,
    summary: 'Iteration across seeds 42, 43, 44, 45, and 46 to quantify performance stability, variance, and standard deviation against the paper.',
    details: [
      'Addresses single-split limitation: The original paper only reported one split with unknown variance.',
      'Computes mean ± standard deviation across 5 independent random splits.',
      'Enables statistical z-score testing to establish whether differences are statistically meaningful or within noise.',
    ],
    codeSnippet: 'for seed in [42, 43, 44, 45, 46]:\n    # Run complete split, CV, refit, test cycle\nraw.groupby("model").agg(["mean", "std"])',
    assumptionIds: [],
  },
]

export default function Pipeline() {
  const { data } = useData()
  const [activeStep, setActiveStep] = useState<number>(1)

  const currentStep = STEPS.find((s) => s.id === activeStep) || STEPS[0]
  const assumptionsList = data?.assumptions || []

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* Title */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <Badge variant="info">End-to-End Replication Architecture</Badge>
          <Badge variant="default">Interactive Flow</Badge>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
          Experimental Pipeline & Modeling Protocol
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, maxWidth: 860 }}>
          Interactive 8-step pipeline replacing static workflow diagrams. Click any step to inspect technical implementation details, preprocessing choices, and explicit distinction between paper-defined parameters and replication assumptions.
        </p>
      </motion.div>

      {/* Interactive Horizontal Stepper */}
      <Card style={{ marginBottom: 24, padding: '24px 20px', overflowX: 'auto' }}>
        <div style={{ minWidth: 780, position: 'relative', padding: '12px 10px' }}>
          {/* Connector Line SVG with pathLength animation */}
          <div style={{ position: 'absolute', top: 32, left: 40, right: 40, height: 2, zIndex: 0 }}>
            <svg width="100%" height="2" style={{ overflow: 'visible' }}>
              <motion.line
                x1="0"
                y1="1"
                x2="100%"
                y2="1"
                stroke="var(--border)"
                strokeWidth="2"
              />
              <motion.line
                x1="0"
                y1="1"
                x2={`${((activeStep - 1) / (STEPS.length - 1)) * 100}%`}
                y2="1"
                stroke="var(--teal)"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            </svg>
          </div>

          {/* Stepper Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            {STEPS.map((s) => {
              const Icon = s.icon
              const isCurrent = s.id === activeStep
              const isPast = s.id < activeStep

              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStep(s.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    width: 80,
                    outline: 'none',
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      background: isCurrent
                        ? 'var(--teal)'
                        : isPast
                        ? 'rgba(45,212,191,0.2)'
                        : 'var(--surface)',
                      border: `2px solid ${
                        isCurrent
                          ? 'var(--teal)'
                          : isPast
                          ? 'var(--teal)'
                          : 'var(--border)'
                      }`,
                      color: isCurrent ? '#0A0F1C' : isPast ? 'var(--teal)' : 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 14,
                      transition: 'all 0.2s ease',
                      boxShadow: isCurrent ? '0 0 16px rgba(45,212,191,0.35)' : 'none',
                    }}
                  >
                    {isPast ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? 'var(--text)' : 'var(--muted)',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {s.title}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Step Detail Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Card style={{ marginBottom: 28, borderLeft: '4px solid var(--teal)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', fontFamily: 'JetBrains Mono' }}>
                  STEP 0{currentStep.id}
                </span>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  {currentStep.title}
                </h2>
                <Badge variant="default">{currentStep.subtitle}</Badge>
              </div>

              {/* Navigation arrows */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  disabled={currentStep.id === 1}
                  onClick={() => setActiveStep((prev) => Math.max(prev - 1, 1))}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    background: 'var(--elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: currentStep.id === 1 ? 'var(--muted)' : 'var(--text)',
                    cursor: currentStep.id === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentStep.id === 1 ? 0.5 : 1,
                  }}
                >
                  Previous
                </button>
                <button
                  disabled={currentStep.id === STEPS.length}
                  onClick={() => setActiveStep((prev) => Math.min(prev + 1, STEPS.length))}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    background: 'var(--teal)',
                    border: 'none',
                    borderRadius: 6,
                    color: '#0A0F1C',
                    fontWeight: 600,
                    cursor: currentStep.id === STEPS.length ? 'not-allowed' : 'pointer',
                    opacity: currentStep.id === STEPS.length ? 0.5 : 1,
                  }}
                >
                  Next Step
                </button>
              </div>
            </div>

            <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5, marginBottom: 16 }}>
              {currentStep.summary}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
              {/* Technical Details List */}
              <div style={{ background: 'var(--elevated)', padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Technical Protocol
                </div>
                <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                  {currentStep.details.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: 6 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Code Implementation Snippet */}
              <div style={{ background: 'var(--elevated)', padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Python Implementation
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    background: 'var(--bg)',
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: '#34D399',
                    overflowX: 'auto',
                    lineHeight: 1.5,
                  }}
                >
                  {currentStep.codeSnippet}
                </pre>
              </div>
            </div>

            {/* Assumptions & Paper Specs for this step */}
            {currentStep.assumptionIds.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Protocol Standards & Assumptions
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {currentStep.assumptionIds.map((assumpId) => {
                    const item = assumptionsList.find((a) => a.id === assumpId)
                    if (!item) return null
                    const isPaper = item.source === 'paper'

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: isPaper ? 'rgba(52,211,153,0.06)' : 'rgba(245,158,11,0.06)',
                          border: `1px solid ${isPaper ? 'rgba(52,211,153,0.2)' : 'rgba(245,158,11,0.2)'}`,
                        }}
                      >
                        <Badge variant={isPaper ? 'success' : 'warning'}>
                          {isPaper ? 'Paper-specified' : 'My assumption'}
                        </Badge>
                        <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
                          {item.text}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Full Assumptions Inventory */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Complete Assumptions & Reproducibility Matrix
            </h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
              Loaded dynamically from assumptions.json – transparent accounting of all design decisions
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12 }}>
          {assumptionsList.map((a) => {
            const isPaper = a.source === 'paper'
            return (
              <div
                key={a.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'var(--elevated)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--muted)' }}>
                    #{a.id}
                  </span>
                  <Badge variant={isPaper ? 'success' : 'warning'}>
                    {isPaper ? 'Paper-specified' : 'My assumption'}
                  </Badge>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
                  {a.text}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
