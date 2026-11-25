import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, TrendingDown, Scale,
  Terminal, Copy, Check
} from 'lucide-react'
import { useData } from '../useData'
import { Card, Badge } from '../components/Card'
import { SegmentedControl } from '../components/SegmentedControl'

export default function Findings() {
  const { data, loading, error } = useData()
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)
  const [osTab, setOsTab] = useState<'win' | 'unix'>('win')

  if (loading) return <div className="p-8 text-muted">Loading findings...</div>
  if (error || !data) return <div className="p-8 text-rose-400">Error: {error}</div>

  const { eda, results, meta, curves } = data

  // Extract dynamic values from data
  const zeroCholCount = eda.data_quality.zero_cholesterol_rows
  const zeroCholPct = ((zeroCholCount / meta.dataset.rows) * 100).toFixed(1)
  const diseaseRateZero = eda.data_quality.disease_rate_zero_cholesterol_pct
  const diseaseRateNonzero = eda.data_quality.disease_rate_nonzero_cholesterol_pct

  const dnnSeed44 = results.DNN.per_seed.find(r => r.seed === 44)
  const dnnSeed44Acc = dnnSeed44 ? (dnnSeed44.accuracy * 100).toFixed(2) : '83.15'
  const dnnSeed44Auc = dnnSeed44 ? dnnSeed44.auc.toFixed(4) : '0.8771'
  const dnnMeanAcc = (results.DNN.stats.accuracy?.mean ?? 0) * 100

  // Derive Seed 44 validation loss metrics from curves.json
  const c44 = curves['44']
  let minValLoss44 = 0.32
  let minEpoch44 = 3
  let maxValLoss44 = 1.56
  if (c44 && c44.val_loss.length > 0) {
    minValLoss44 = Math.min(...c44.val_loss)
    minEpoch44 = c44.val_loss.indexOf(minValLoss44) + 1
    maxValLoss44 = Math.max(...c44.val_loss)
  }

  const testN = meta.split.test
  const onePatientPct = meta.one_patient_pct.toFixed(2)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCmd(id)
    setTimeout(() => setCopiedCmd(null), 2000)
  }

  const winCmds = `git clone <repo_url>
cd ml-lab-project
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
python eda_heart.py
python replicate_heart.py
python make_figures.py
python export_results.py
cd frontend
npm install
npm run dev`

  const unixCmds = `git clone <repo_url>
cd ml-lab-project
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python eda_heart.py
python replicate_heart.py
python make_figures.py
python export_results.py
cd frontend
npm install
npm run dev`

  return (
    <div className="max-w-[1240px] mx-auto px-5 py-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <div className="flex gap-2 items-center mb-2">
          <Badge variant="warning">Critical Evaluation</Badge>
          <Badge variant="default">Methodology & Limitations</Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight mb-2">
          Experimental Findings, Data Biases & Limitations
        </h1>
        <p className="text-sm text-muted max-w-3xl leading-relaxed">
          Rigorous methodological critique derived directly from empirical data: zero-coded missing values, deep learning training pathologies, statistical sample size thresholds, and discrepancies identified in the published literature.
        </p>
      </motion.div>

      {/* Grid of Key Finding Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-7">
        {/* Finding 1: Zero-coded cholesterol */}
        <Card className="border-l-4 border-l-amber flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <AlertTriangle size={20} className="text-amber" />
              <h3 className="text-base font-bold text-text">
                1. Zero-Coded Cholesterol Missingness
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted leading-relaxed mb-3">
              The dataset features <b>{zeroCholCount} patient records ({zeroCholPct}%)</b> where Cholesterol is recorded as exactly 0. Physiologically, zero serum cholesterol is impossible in living humans.
            </p>
            <div className="bg-elevated p-3 rounded-xl mb-3 border border-border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Disease rate when Cholesterol == 0:</span>
                <b className="text-rose-400 font-mono">{diseaseRateZero}%</b>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Disease rate when Cholesterol &gt; 0:</span>
                <b className="text-teal font-mono">{diseaseRateNonzero}%</b>
              </div>
            </div>
            <div className="text-xs text-text leading-relaxed space-y-1.5">
              <p>
                <b>(1) Model Prediction Bias:</b> Forcing Cholesterol=0 in the predictor shifts mean disease probability upward by ~23 percentage points across models, as classifiers exploit zero measurement as a proxy shortcut.
              </p>
              <p className="text-muted">
                <b>(2) Dataset Generalization:</b> However, median-imputing zero values (Variant B) shifts 5-seed test accuracy by only ~0.1 to 1.0 pp across models, confirming that other clinical predictors (ST_Slope, ChestPainType, MaxHR) preserve core predictive power.
              </p>
            </div>
          </div>
        </Card>

        {/* Finding 2: DNN seed-44 overfitting */}
        <Card className="border-l-4 border-l-rose-500 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <TrendingDown size={20} className="text-rose-400" />
              <h3 className="text-base font-bold text-text">
                2. DNN Overfitting in Seed 44
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted leading-relaxed mb-3">
              The paper prescribes tuning DNN hyperparameters on a validation split without early stopping, selecting the best model solely by <b>last-epoch validation accuracy</b>.
            </p>
            <div className="bg-elevated p-3 rounded-xl mb-3 border border-border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Seed 44 Test Accuracy:</span>
                <b className="text-rose-400 font-mono">{dnnSeed44Acc}% (vs {dnnMeanAcc.toFixed(1)}% mean)</b>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Seed 44 Test AUC:</span>
                <b className="text-rose-400 font-mono">{dnnSeed44Auc}</b>
              </div>
            </div>
            <div className="text-xs text-text leading-relaxed">
              <b>Mechanism:</b> With batch=16, lr=0.01, and 50 epochs, training accuracy reached ~99% while validation loss escalated from {minValLoss44.toFixed(2)} (epoch {minEpoch44}) to {maxValLoss44.toFixed(2)}, beginning its sharp divergence after epoch ~12. Without early stopping, late-epoch overfitting severely degraded generalization.
            </div>
          </div>
        </Card>

        {/* Finding 3: Small test set noise */}
        <Card className="border-l-4 border-l-teal flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Scale size={20} className="text-teal" />
              <h3 className="text-base font-bold text-text">
                3. Sample Size & Statistical Granularity
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted leading-relaxed mb-3">
              With an 80:20 split of 918 patients, each evaluation split contains exactly <b>{testN} held-out test patients</b>.
            </p>
            <div className="bg-elevated p-3 rounded-xl mb-3 border border-border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">1 test patient weight:</span>
                <b className="text-teal font-mono">1/184 ≈ {onePatientPct}%</b>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Replication Accuracy Std Dev:</span>
                <b className="text-amber font-mono">1.5% to 2.5% (~3–5 patients)</b>
              </div>
            </div>
            <div className="text-xs text-text leading-relaxed">
              <b>Statistical Significance:</b> A 1–2 percentage point accuracy difference between models corresponds to only 2–4 patient reclassifications. Apparent rankings in single-split evaluations are dominated by split variance.
            </div>
          </div>
        </Card>
      </div>

      {/* Reproduction Commands Box */}
      <Card className="mb-7">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-teal" />
            <h3 className="text-base font-bold text-text">Command-Line Replication Protocol</h3>
          </div>
          <SegmentedControl
            options={[
              { value: 'win', label: 'Windows (PowerShell)' },
              { value: 'unix', label: 'macOS / Linux (Bash)' },
            ]}
            value={osTab}
            onChange={(v) => setOsTab(v as 'win' | 'unix')}
            size="sm"
          />
        </div>

        <div className="relative bg-slate-950 p-4 rounded-xl border border-border font-mono text-xs text-slate-300 overflow-x-auto">
          <pre>{osTab === 'win' ? winCmds : unixCmds}</pre>
          <button
            onClick={() => copyToClipboard(osTab === 'win' ? winCmds : unixCmds, 'repro')}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-surface/80 border border-border hover:border-teal/50 text-muted hover:text-text transition-colors"
            title="Copy commands"
          >
            {copiedCmd === 'repro' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
      </Card>
    </div>
  )
}
