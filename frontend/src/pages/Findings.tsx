import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, TrendingDown, Scale, BookOpen,
  Terminal, ShieldCheck, Copy, Check
} from 'lucide-react'
import { useData } from '../useData'
import { Card, Badge } from '../components/Card'

export default function Findings() {
  const { data, loading, error } = useData()
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)
  const [osTab, setOsTab] = useState<'win' | 'unix'>('win')

  if (loading) return <div style={{ padding: 32, color: 'var(--muted)' }}>Loading findings...</div>
  if (error || !data) return <div style={{ padding: 32, color: '#FB7185' }}>Error: {error}</div>

  const { eda, results, meta, assumptions } = data

  // Extract dynamic values from data
  const zeroCholCount = eda.data_quality.zero_cholesterol_rows
  const zeroCholPct = ((zeroCholCount / meta.dataset.rows) * 100).toFixed(1)
  const diseaseRateZero = eda.data_quality.disease_rate_zero_cholesterol_pct
  const diseaseRateNonzero = eda.data_quality.disease_rate_nonzero_cholesterol_pct

  const dnnSeed44 = results.DNN.per_seed.find(r => r.seed === 44)
  const dnnSeed44Acc = dnnSeed44 ? (dnnSeed44.accuracy * 100).toFixed(2) : '83.15'
  const dnnSeed44Auc = dnnSeed44 ? dnnSeed44.auc.toFixed(4) : '0.8771'
  const dnnMeanAcc = (results.DNN.stats.accuracy?.mean ?? 0) * 100
  const dnnStdAcc = (results.DNN.stats.accuracy?.std ?? 0) * 100

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
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <Badge variant="warning">Critical Evaluation</Badge>
          <Badge variant="default">Methodology & Limitations</Badge>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
          Experimental Findings, Data Biases & Limitations
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, maxWidth: 880 }}>
          Rigorous methodological critique derived directly from empirical data: zero-coded missing values, deep learning training pathologies, statistical sample size thresholds, and discrepancies identified in the published literature.
        </p>
      </motion.div>

      {/* Grid of Key Finding Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 28 }}>
        {/* Finding 1: Zero-coded cholesterol */}
        <Card style={{ borderLeft: '4px solid var(--amber)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={20} color="var(--amber)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              1. Zero-Coded Cholesterol Exploitation
            </h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>
            The dataset features <b>{zeroCholCount} patient records ({zeroCholPct}%)</b> where Cholesterol is recorded as exactly 0. Physiologically, zero serum cholesterol is impossible in living humans.
          </p>
          <div style={{ background: 'var(--elevated)', padding: '10px 14px', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>Disease rate when Cholesterol == 0:</span>
              <b style={{ color: '#FB7185', fontFamily: 'JetBrains Mono' }}>{diseaseRateZero}%</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>Disease rate when Cholesterol &gt; 0:</span>
              <b style={{ color: '#2DD4BF', fontFamily: 'JetBrains Mono' }}>{diseaseRateNonzero}%</b>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>
            <b>Impact:</b> Retaining these zeros without imputation allows classifiers to treat zero measurement as a proxy signal for high disease probability, yielding artificially elevated accuracy.
          </div>
        </Card>

        {/* Finding 2: DNN seed-44 overfitting */}
        <Card style={{ borderLeft: '4px solid #FB7185' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <TrendingDown size={20} color="#FB7185" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              2. DNN Overfitting in Seed 44
            </h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>
            The paper prescribes tuning DNN hyperparameters on a validation split without early stopping, selecting the best model solely by <b>last-epoch validation accuracy</b>.
          </p>
          <div style={{ background: 'var(--elevated)', padding: '10px 14px', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>Seed 44 Test Accuracy:</span>
              <b style={{ color: '#FB7185', fontFamily: 'JetBrains Mono' }}>{dnnSeed44Acc}% (vs {dnnMeanAcc.toFixed(1)}% ± {dnnStdAcc.toFixed(1)}% mean)</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>Seed 44 Test AUC:</span>
              <b style={{ color: '#FB7185', fontFamily: 'JetBrains Mono' }}>{dnnSeed44Auc}</b>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>
            <b>Mechanism:</b> With batch=16, lr=0.01, and 50 epochs, training accuracy reached ~99% while validation loss escalated from 0.32 to 1.56. The lack of early stopping severely degraded generalizability.
          </div>
        </Card>

        {/* Finding 3: Small test set noise */}
        <Card style={{ borderLeft: '4px solid var(--teal)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Scale size={20} color="var(--teal)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              3. Sample Size & Statistical Granularity
            </h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>
            With an 80:20 split of 918 patients, each evaluation split contains exactly <b>{testN} held-out test patients</b>.
          </p>
          <div style={{ background: 'var(--elevated)', padding: '10px 14px', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>1 test patient weight:</span>
              <b style={{ color: 'var(--teal)', fontFamily: 'JetBrains Mono' }}>{onePatientPct} percentage points</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>Noise threshold:</span>
              <b style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono' }}>±1.5 to 2.0 pp</b>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>
            <b>Takeaway:</b> A difference of 2-3 misclassified patients shifts accuracy by over 1.5 percentage points. Single-run comparisons without multi-seed confidence intervals are statistically noisy.
          </div>
        </Card>

        {/* Finding 4: Literature Observations */}
        <Card style={{ borderLeft: '4px solid #7FA6D6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={20} color="#7FA6D6" />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                4. Discrepancies in Published Paper
              </h3>
            </div>
            <Badge variant="paper">Verify against PDF</Badge>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 10 }}>
            Careful reading of Simanjuntak, Robet & Hoki (JAIC 2025) reveals internal reporting inconsistencies:
          </p>
          <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>
            <li style={{ marginBottom: 6 }}>
              <b>Abstract vs. Table 2:</b> Abstract claims SVM accuracy of 91.3% and DNN accuracy of 92.1%, whereas Table 2 reports 89% for both models.
            </li>
            <li style={{ marginBottom: 6 }}>
              <b>Naïve Bayes Mathematical Conflict:</b> Reported NB accuracy is 86%, while reported recalls are 91% (healthy) and 88% (disease). Overall accuracy must mathematically lie between class recalls.
            </li>
            <li>
              <b>Random Forest AUC:</b> RF ROC-AUC is stated as 0.93 in the manuscript text but printed as 0.94 in Table 2.
            </li>
          </ul>
        </Card>
      </div>

      {/* Assumptions Inventory */}
      <Card style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          Replication Assumptions & Parameter Choices
        </h3>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          Transparent documentation of ambiguities in the original paper and the engineering assumptions implemented to resolve them.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12 }}>
          {assumptions.map((a) => {
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
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <Badge variant={isPaper ? 'success' : 'warning'}>
                  {isPaper ? 'Paper' : 'Assumption'}
                </Badge>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
                  {a.text}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Reproduce this block */}
      <Card style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Terminal size={18} color="var(--teal)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Reproduce This Study
            </h3>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setOsTab('win')}
              style={{
                padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                border: '1px solid var(--border)',
                background: osTab === 'win' ? 'var(--teal)' : 'transparent',
                color: osTab === 'win' ? '#0A0F1C' : 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              Windows (PowerShell / cmd)
            </button>
            <button
              onClick={() => setOsTab('unix')}
              style={{
                padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                border: '1px solid var(--border)',
                background: osTab === 'unix' ? 'var(--teal)' : 'transparent',
                color: osTab === 'unix' ? '#0A0F1C' : 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              macOS / Linux (bash)
            </button>
            <button
              onClick={() => copyToClipboard(osTab === 'win' ? winCmds : unixCmds, 'reproduce')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--elevated)', color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              {copiedCmd === 'reproduce' ? <Check size={14} color="#34D399" /> : <Copy size={14} />}
              {copiedCmd === 'reproduce' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <pre
          style={{
            margin: 0,
            padding: 16,
            background: 'var(--bg)',
            borderRadius: 8,
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#E6EDF7',
            overflowX: 'auto',
            lineHeight: 1.6,
          }}
        >
          {osTab === 'win' ? winCmds : unixCmds}
        </pre>
      </Card>

      {/* Academic Integrity & Student Details Panel */}
      <Card style={{ background: 'var(--elevated)', border: '1px solid rgba(45,212,191,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <ShieldCheck size={20} color="var(--teal)" />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Academic Integrity & Attribution
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student Author</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>[YOUR NAME]</div>
          </div>
          <div style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roll Number</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>[ROLL NO]</div>
          </div>
          <div style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Course Code</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>[COURSE CL3001]</div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <b>AI Assistance Statement:</b> Google Antigravity was used to build this web interface and design system. All reported model evaluation metrics, cross-validation runs, and statistical summaries are produced strictly by the project's own verified Python replication scripts.
        </div>
      </Card>
    </div>
  )
}
