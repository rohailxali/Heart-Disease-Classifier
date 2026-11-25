import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Award, ArrowUpDown, AlertTriangle
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts'
import { useData } from '../useData'
import { Card, Badge } from '../components/Card'
import { fmtPct, fmtAUC, MODELS, MODEL_LABELS } from '../utils'

type SortField = 'accuracy' | 'auc' | 'precision0' | 'precision1' | 'recall0' | 'recall1' | 'f1_0' | 'f1_1' | 'cv_acc'

export default function Results() {
  const { data, loading, error } = useData()
  const [sortField, setSortField] = useState<SortField>('accuracy')
  const [sortAsc, setSortAsc] = useState<boolean>(false)

  // Confusion matrix state
  const [cmSeed, setCmSeed] = useState<'pooled' | number>('pooled')
  const [cmMode, setCmMode] = useState<'counts' | 'percent'>('counts')
  const [cmModel, setCmModel] = useState<string>('SVM')

  // DNN curves state
  const [curveSeed, setCurveSeed] = useState<number>(44) // Default to 44 to highlight overfitting finding
  const [curveMetric, setCurveMetric] = useState<'loss' | 'accuracy'>('loss')

  if (loading) return <div style={{ padding: 32, color: 'var(--muted)' }}>Loading results...</div>
  if (error || !data) return <div style={{ padding: 32, color: '#FB7185' }}>Error: {error}</div>

  const { results, params, curves } = data

  // Prepare Leaderboard Data
  const leaderboard = MODELS.map((model) => {
    const r = results[model]
    const s = r.stats
    return {
      model,
      name: MODEL_LABELS[model],
      accuracy: s.accuracy?.mean ?? 0,
      accuracy_std: s.accuracy?.std ?? 0,
      auc: s.auc?.mean ?? 0,
      auc_std: s.auc?.std ?? 0,
      precision0: s.precision0?.mean ?? 0,
      precision1: s.precision1?.mean ?? 0,
      recall0: s.recall0?.mean ?? 0,
      recall1: s.recall1?.mean ?? 0,
      f1_0: s.f1_0?.mean ?? 0,
      f1_1: s.f1_1?.mean ?? 0,
      cv_acc: s.cv_acc?.mean ?? null,
    }
  })

  // Determine best value for each column for highlighting
  const bestValues: Record<string, number> = {
    accuracy: Math.max(...leaderboard.map(d => d.accuracy)),
    auc: Math.max(...leaderboard.map(d => d.auc)),
    precision0: Math.max(...leaderboard.map(d => d.precision0)),
    precision1: Math.max(...leaderboard.map(d => d.precision1)),
    recall0: Math.max(...leaderboard.map(d => d.recall0)),
    recall1: Math.max(...leaderboard.map(d => d.recall1)),
    f1_0: Math.max(...leaderboard.map(d => d.f1_0)),
    f1_1: Math.max(...leaderboard.map(d => d.f1_1)),
    cv_acc: Math.max(...leaderboard.map(d => d.cv_acc || 0)),
  }

  // Sort Leaderboard
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    const valA = a[sortField] ?? -999
    const valB = b[sortField] ?? -999
    return sortAsc ? valA - valB : valB - valA
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  // Active confusion matrix
  const currentModelRes = results[cmModel]
  let activeCM = { TN: 0, FP: 0, FN: 0, TP: 0 }
  if (cmSeed === 'pooled') {
    activeCM = currentModelRes.confusion_pooled
  } else {
    const match = currentModelRes.confusion_per_seed.find(c => c.seed === cmSeed)
    if (match) activeCM = match
  }

  const actualHealthy = activeCM.TN + activeCM.FP
  const actualDisease = activeCM.FN + activeCM.TP

  // Format CM cell
  const formatCMCell = (count: number, actualTotal: number) => {
    if (cmMode === 'counts') {
      return count.toString()
    }
    const pct = actualTotal > 0 ? (count / actualTotal) * 100 : 0
    return `${pct.toFixed(1)}%`
  }

  // DNN Curves Data for selected seed
  const activeCurve = curves[curveSeed.toString()]
  const curveChartData = activeCurve
    ? activeCurve.epochs.map((ep, idx) => ({
        epoch: ep,
        loss: activeCurve.loss[idx],
        val_loss: activeCurve.val_loss[idx],
        accuracy: Number((activeCurve.accuracy[idx] * 100).toFixed(1)),
        val_accuracy: Number((activeCurve.val_accuracy[idx] * 100).toFixed(1)),
      }))
    : []

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <Badge variant="info">Empirical Results</Badge>
          <Badge variant="default">5 Seeds (42–46)</Badge>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
          Model Benchmark Leaderboard & Error Analysis
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, maxWidth: 880 }}>
          Comprehensive evaluation of all 6 models across 5 random seeds (734 train, 184 test patients per seed). Explore performance metrics, per-seed dispersion, confusion matrices, and DNN convergence dynamics.
        </p>
      </motion.div>

      {/* Sortable Leaderboard */}
      <Card style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Replication Performance Leaderboard (Mean ± SD)
            </h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
              Click column headers to sort. Best value per metric highlighted in green.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
            <Award size={15} color="#34D399" /> Best in class
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 840 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>Model</th>
                <th
                  onClick={() => handleSort('accuracy')}
                  style={{ padding: '10px 12px', fontSize: 12, color: sortField === 'accuracy' ? 'var(--teal)' : 'var(--muted)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Accuracy ± SD <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('auc')}
                  style={{ padding: '10px 12px', fontSize: 12, color: sortField === 'auc' ? 'var(--teal)' : 'var(--muted)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    ROC-AUC ± SD <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('precision0')}
                  style={{ padding: '10px 12px', fontSize: 12, color: sortField === 'precision0' ? 'var(--teal)' : 'var(--muted)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    P (Healthy) <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('precision1')}
                  style={{ padding: '10px 12px', fontSize: 12, color: sortField === 'precision1' ? 'var(--teal)' : 'var(--muted)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    P (Disease) <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('recall0')}
                  style={{ padding: '10px 12px', fontSize: 12, color: sortField === 'recall0' ? 'var(--teal)' : 'var(--muted)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    R (Healthy) <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('recall1')}
                  style={{ padding: '10px 12px', fontSize: 12, color: sortField === 'recall1' ? 'var(--teal)' : 'var(--muted)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    R (Disease) <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('f1_0')}
                  style={{ padding: '10px 12px', fontSize: 12, color: sortField === 'f1_0' ? 'var(--teal)' : 'var(--muted)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    F1 (Healthy) <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('f1_1')}
                  style={{ padding: '10px 12px', fontSize: 12, color: sortField === 'f1_1' ? 'var(--teal)' : 'var(--muted)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    F1 (Disease) <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cv_acc')}
                  style={{ padding: '10px 12px', fontSize: 12, color: sortField === 'cv_acc' ? 'var(--teal)' : 'var(--muted)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    5-Fold CV Acc <ArrowUpDown size={12} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLeaderboard.map((row) => {
                const isBestAcc = Math.abs(row.accuracy - bestValues.accuracy) < 1e-4
                const isBestAuc = Math.abs(row.auc - bestValues.auc) < 1e-4

                return (
                  <tr
                    key={row.model}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      fontSize: 13,
                      fontFamily: 'JetBrains Mono, monospace',
                      background: row.model === 'SVM' ? 'rgba(45,212,191,0.04)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{row.model}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>({row.name})</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: isBestAcc ? '#34D399' : 'var(--text)', fontWeight: isBestAcc ? 700 : 500 }}>
                      {fmtPct(row.accuracy)} <span style={{ fontSize: 11, color: 'var(--muted)' }}>± {(row.accuracy_std * 100).toFixed(1)}%</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: isBestAuc ? '#34D399' : 'var(--text)', fontWeight: isBestAuc ? 700 : 500 }}>
                      {fmtAUC(row.auc)} <span style={{ fontSize: 11, color: 'var(--muted)' }}>± {fmtAUC(row.auc_std)}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: Math.abs(row.precision0 - bestValues.precision0) < 1e-4 ? '#34D399' : 'var(--muted)' }}>
                      {fmtPct(row.precision0)}
                    </td>
                    <td style={{ padding: '10px 12px', color: Math.abs(row.precision1 - bestValues.precision1) < 1e-4 ? '#34D399' : 'var(--muted)' }}>
                      {fmtPct(row.precision1)}
                    </td>
                    <td style={{ padding: '10px 12px', color: Math.abs(row.recall0 - bestValues.recall0) < 1e-4 ? '#34D399' : 'var(--muted)' }}>
                      {fmtPct(row.recall0)}
                    </td>
                    <td style={{ padding: '10px 12px', color: Math.abs(row.recall1 - bestValues.recall1) < 1e-4 ? '#34D399' : 'var(--muted)' }}>
                      {fmtPct(row.recall1)}
                    </td>
                    <td style={{ padding: '10px 12px', color: Math.abs(row.f1_0 - bestValues.f1_0) < 1e-4 ? '#34D399' : 'var(--muted)' }}>
                      {fmtPct(row.f1_0)}
                    </td>
                    <td style={{ padding: '10px 12px', color: Math.abs(row.f1_1 - bestValues.f1_1) < 1e-4 ? '#34D399' : 'var(--muted)' }}>
                      {fmtPct(row.f1_1)}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>
                      {row.cv_acc !== null ? fmtPct(row.cv_acc) : <span style={{ fontStyle: 'italic', color: 'var(--muted)' }}>N/A (split)</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Per-Seed Accuracy Strip Plot (Custom SVG) */}
      <Card style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Per-Seed Test Accuracy Dispersion
            </h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
              Individual test accuracy for seeds 42, 43, 44, 45, 46. Seed 44 DNN outlier prominently highlighted.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)' }} /> Seeds 42-46
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#FB7185' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FB7185' }} /> Seed 44 Outlier
            </span>
          </div>
        </div>

        {/* Custom SVG Strip Plot */}
        <div style={{ overflowX: 'auto', padding: '10px 0' }}>
          <svg viewBox="0 0 740 220" style={{ width: '100%', minWidth: 620, height: 'auto', display: 'block' }}>
            {/* Grid lines and Y-axis (78% to 92%) */}
            {[0.78, 0.81, 0.84, 0.87, 0.90, 0.92].map((yVal) => {
              // Y scale: 0.78 -> 190, 0.92 -> 20
              const yPos = 190 - ((yVal - 0.78) / (0.92 - 0.78)) * 170
              return (
                <g key={yVal}>
                  <line x1="60" y1={yPos} x2="720" y2={yPos} stroke="var(--border)" strokeDasharray="3 3" />
                  <text x="50" y={yPos + 4} fill="var(--muted)" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono">
                    {(yVal * 100).toFixed(0)}%
                  </text>
                </g>
              )
            })}

            {/* Model Columns */}
            {MODELS.map((model, mIdx) => {
              const xPos = 110 + mIdx * 105
              const perSeed = results[model].per_seed
              const meanAcc = results[model].stats.accuracy?.mean ?? 0
              const meanY = 190 - ((meanAcc - 0.78) / (0.92 - 0.78)) * 170

              return (
                <g key={model}>
                  {/* Model column line & label */}
                  <line x1={xPos} y1="20" x2={xPos} y2="190" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
                  <text x={xPos} y="210" fill="var(--text)" fontSize="12" fontWeight="700" textAnchor="middle">
                    {model}
                  </text>

                  {/* Mean marker line */}
                  <line x1={xPos - 16} y1={meanY} x2={xPos + 16} y2={meanY} stroke="#F59E0B" strokeWidth="2" />

                  {/* Individual seed dots */}
                  {perSeed.map((row) => {
                    const accY = 190 - ((row.accuracy - 0.78) / (0.92 - 0.78)) * 170
                    const isOutlier = model === 'DNN' && row.seed === 44

                    return (
                      <g key={row.seed}>
                        <circle
                          cx={xPos}
                          cy={accY}
                          r={isOutlier ? 6 : 4}
                          fill={isOutlier ? '#FB7185' : 'var(--teal)'}
                          stroke="var(--surface)"
                          strokeWidth="1.5"
                        />
                        {isOutlier && (
                          <g>
                            {/* Annotation line and text */}
                            <line x1={xPos + 6} y1={accY} x2={xPos + 36} y2={accY - 18} stroke="#FB7185" strokeWidth="1.2" />
                            <rect x={xPos + 38} y={accY - 32} width="110" height="26" rx="4" fill="var(--surface)" stroke="#FB7185" />
                            <text x={xPos + 44} y={accY - 16} fill="#FB7185" fontSize="10" fontWeight="700">
                              Seed 44: 83.15% ⚠
                            </text>
                          </g>
                        )}
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </svg>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, fontStyle: 'italic' }}>
          Amber bars represent mean accuracy. Note how Decision Tree and DNN exhibit broader spread across random splits, while Logistic Regression and Naïve Bayes maintain tight clustering.
        </div>
      </Card>

      {/* Confusion Matrices & Hyperparameter Stability Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, marginBottom: 28 }}>
        {/* Confusion Matrix Interactive Viewer */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Confusion Matrix Explorer
              </h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                {cmSeed === 'pooled' ? 'Summed over 5 seeds (920 test cases)' : `Seed ${cmSeed} hold-out test set (184 cases)`}
              </p>
            </div>

            {/* Model Selector */}
            <select
              value={cmModel}
              onChange={(e) => setCmModel(e.target.value)}
              style={{
                background: 'var(--elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {MODELS.map(m => (
                <option key={m} value={m}>{m} ({MODEL_LABELS[m]})</option>
              ))}
            </select>
          </div>

          {/* Seed and Format Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setCmSeed('pooled')}
                style={{
                  padding: '4px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                  border: '1px solid',
                  borderColor: cmSeed === 'pooled' ? 'var(--teal)' : 'var(--border)',
                  background: cmSeed === 'pooled' ? 'rgba(45,212,191,0.15)' : 'transparent',
                  color: cmSeed === 'pooled' ? 'var(--teal)' : 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                Pooled (All 5)
              </button>
              {[42, 43, 44, 45, 46].map((s) => (
                <button
                  key={s}
                  onClick={() => setCmSeed(s)}
                  style={{
                    padding: '4px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                    border: '1px solid',
                    borderColor: cmSeed === s ? 'var(--teal)' : 'var(--border)',
                    background: cmSeed === s ? 'rgba(45,212,191,0.15)' : 'transparent',
                    color: cmSeed === s ? 'var(--teal)' : 'var(--muted)',
                    cursor: 'pointer',
                  }}
                >
                  Seed {s}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setCmMode('counts')}
                style={{
                  padding: '4px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                  border: '1px solid',
                  borderColor: cmMode === 'counts' ? 'var(--amber)' : 'var(--border)',
                  background: cmMode === 'counts' ? 'rgba(245,158,11,0.15)' : 'transparent',
                  color: cmMode === 'counts' ? 'var(--amber)' : 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                Counts
              </button>
              <button
                onClick={() => setCmMode('percent')}
                style={{
                  padding: '4px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                  border: '1px solid',
                  borderColor: cmMode === 'percent' ? 'var(--amber)' : 'var(--border)',
                  background: cmMode === 'percent' ? 'rgba(245,158,11,0.15)' : 'transparent',
                  color: cmMode === 'percent' ? 'var(--amber)' : 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                Percentages
              </button>
            </div>
          </div>

          {/* 2x2 Matrix Display */}
          <div style={{ maxWidth: 360, margin: '0 auto', padding: '10px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: 8, alignItems: 'center' }}>
              <div />
              <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                Pred Healthy (0)
              </div>
              <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                Pred Disease (1)
              </div>

              {/* Row 1: Actual Healthy */}
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                Actual Healthy (0)
              </div>
              <div
                style={{
                  background: 'rgba(45,212,191,0.18)',
                  border: '1px solid rgba(45,212,191,0.4)',
                  borderRadius: 8,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 10, color: 'var(--teal)', fontWeight: 700 }}>TRUE NEGATIVE</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--text)' }}>
                  {formatCMCell(activeCM.TN, actualHealthy)}
                </div>
              </div>
              <div
                style={{
                  background: 'rgba(251,113,133,0.1)',
                  border: '1px solid rgba(251,113,133,0.3)',
                  borderRadius: 8,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 10, color: '#FB7185', fontWeight: 700 }}>FALSE POSITIVE</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--text)' }}>
                  {formatCMCell(activeCM.FP, actualHealthy)}
                </div>
              </div>

              {/* Row 2: Actual Disease */}
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                Actual Disease (1)
              </div>
              <div
                style={{
                  background: 'rgba(251,113,133,0.1)',
                  border: '1px solid rgba(251,113,133,0.3)',
                  borderRadius: 8,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 10, color: '#FB7185', fontWeight: 700 }}>FALSE NEGATIVE</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--text)' }}>
                  {formatCMCell(activeCM.FN, actualDisease)}
                </div>
              </div>
              <div
                style={{
                  background: 'rgba(45,212,191,0.18)',
                  border: '1px solid rgba(45,212,191,0.4)',
                  borderRadius: 8,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 10, color: 'var(--teal)', fontWeight: 700 }}>TRUE POSITIVE</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--text)' }}>
                  {formatCMCell(activeCM.TP, actualDisease)}
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12 }}>
              <div>
                <span style={{ color: 'var(--muted)' }}>Specificity (R0): </span>
                <b style={{ color: 'var(--text)' }}>
                  {actualHealthy > 0 ? `${((activeCM.TN / actualHealthy) * 100).toFixed(1)}%` : '0%'}
                </b>
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Sensitivity (R1): </span>
                <b style={{ color: 'var(--text)' }}>
                  {actualDisease > 0 ? `${((activeCM.TP / actualDisease) * 100).toFixed(1)}%` : '0%'}
                </b>
              </div>
            </div>
          </div>
        </Card>

        {/* Hyperparameter Stability Heatmap */}
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            Hyperparameter Stability Across Seeds
          </h3>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
            Config chosen by 5-fold CV grid search (or validation split for DNN) for each seed
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px 6px', color: 'var(--muted)' }}>Model</th>
                  <th style={{ padding: '8px 6px', color: 'var(--muted)' }}>Seed 42</th>
                  <th style={{ padding: '8px 6px', color: 'var(--muted)' }}>Seed 43</th>
                  <th style={{ padding: '8px 6px', color: 'var(--muted)' }}>Seed 44</th>
                  <th style={{ padding: '8px 6px', color: 'var(--muted)' }}>Seed 45</th>
                  <th style={{ padding: '8px 6px', color: 'var(--muted)' }}>Seed 46</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map((m) => {
                  const mParams = params[m] || []
                  return (
                    <tr key={m} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--text)' }}>{m}</td>
                      {[42, 43, 44, 45, 46].map((seed) => {
                        const seedConfig = mParams.find((p) => p.seed === seed) || {}
                        const cleanPairs = Object.entries(seedConfig)
                          .filter(([k]) => k !== 'seed' && k !== 'model')
                          .map(([k, v]) => `${k}=${v}`)
                          .join(', ')

                        return (
                          <td
                            key={seed}
                            style={{
                              padding: '8px 6px',
                              fontFamily: 'JetBrains Mono',
                              fontSize: 10,
                              color: 'var(--muted)',
                              lineHeight: 1.3,
                            }}
                          >
                            {cleanPairs || '-'}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>
            <b>Observation:</b> SVM consistently selects <code style={{ color: 'var(--teal)' }}>C=1.0, rbf</code> across 4 of 5 seeds (linear only on seed 43). Random Forest always selects <code style={{ color: 'var(--teal)' }}>max_features=sqrt</code>.
          </div>
        </Card>
      </div>

      {/* DNN Training Convergence & Overfitting Analysis */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                DNN Training Curves (Tuning Phase Validation Dynamics)
              </h3>
              {curveSeed === 44 && (
                <Badge variant="danger">Catastrophic Overfitting Identified</Badge>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
              Evaluated during hyperparameter selection on an 80:20 validation split of the training set (no early stopping)
            </p>
          </div>

          {/* Seed Selector & Metric Toggle */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[42, 43, 44, 45, 46].map((s) => (
                <button
                  key={s}
                  onClick={() => setCurveSeed(s)}
                  style={{
                    padding: '4px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                    border: '1px solid',
                    borderColor: curveSeed === s ? (s === 44 ? '#FB7185' : 'var(--teal)') : 'var(--border)',
                    background: curveSeed === s ? (s === 44 ? 'rgba(251,113,133,0.15)' : 'rgba(45,212,191,0.15)') : 'transparent',
                    color: curveSeed === s ? (s === 44 ? '#FB7185' : 'var(--teal)') : 'var(--muted)',
                    cursor: 'pointer',
                  }}
                >
                  Seed {s} {s === 44 ? '⚠' : ''}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setCurveMetric('loss')}
                style={{
                  padding: '4px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                  border: '1px solid',
                  borderColor: curveMetric === 'loss' ? 'var(--amber)' : 'var(--border)',
                  background: curveMetric === 'loss' ? 'rgba(245,158,11,0.15)' : 'transparent',
                  color: curveMetric === 'loss' ? 'var(--amber)' : 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                Loss
              </button>
              <button
                onClick={() => setCurveMetric('accuracy')}
                style={{
                  padding: '4px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                  border: '1px solid',
                  borderColor: curveMetric === 'accuracy' ? 'var(--amber)' : 'var(--border)',
                  background: curveMetric === 'accuracy' ? 'rgba(245,158,11,0.15)' : 'transparent',
                  color: curveMetric === 'accuracy' ? 'var(--amber)' : 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                Accuracy
              </button>
            </div>
          </div>
        </div>

        {/* Selected Config Info */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12, background: 'var(--elevated)', padding: '10px 14px', borderRadius: 8 }}>
          <div>
            <span style={{ color: 'var(--muted)' }}>Chosen Architecture: </span>
            <b style={{ color: 'var(--text)' }}>Batch={activeCurve?.best_config.batch}, LR={activeCurve?.best_config.lr}, Epochs={activeCurve?.best_config.epochs}</b>
          </div>
          <div>
            <span style={{ color: 'var(--muted)' }}>Selection Criterion: </span>
            <span style={{ color: 'var(--amber)' }}>Last-epoch validation accuracy (no early stopping)</span>
          </div>
        </div>

        {/* Line Chart */}
        <div style={{ height: 280, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curveChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="epoch" stroke="var(--muted)" fontSize={11} label={{ value: 'Epoch', position: 'insideBottom', offset: -5, fill: 'var(--muted)', fontSize: 11 }} />
              <YAxis stroke="var(--muted)" fontSize={11} domain={curveMetric === 'loss' ? [0, 'auto'] : [50, 100]} />
              <RechartsTooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {curveMetric === 'loss' ? (
                <>
                  <Line type="monotone" dataKey="loss" name="Train Loss" stroke="#2DD4BF" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="val_loss" name="Val Loss" stroke="#FB7185" strokeWidth={2} dot={false} />
                </>
              ) : (
                <>
                  <Line type="monotone" dataKey="accuracy" name="Train Accuracy (%)" stroke="#2DD4BF" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="val_accuracy" name="Val Accuracy (%)" stroke="#FB7185" strokeWidth={2} dot={false} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Annotation Box */}
        {curveSeed === 44 && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.3)', borderRadius: 8, fontSize: 13, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, color: '#FB7185', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={16} /> Detailed Finding: Seed 44 Validation Loss Divergence
            </div>
            <div style={{ color: 'var(--text)' }}>
              For seed 44, the grid search selected <code style={{ color: '#FB7185' }}>batch=16, lr=0.01, epochs=50</code> based on a lucky late-epoch validation accuracy spike (87.07% at epoch 50). However, examination of the loss curves shows that validation loss bottomed out at epoch 3 (0.323) and subsequently escalated by <b>+382% to 1.561</b>, while training accuracy climbed to ~99%.
            </div>
            <div style={{ color: 'var(--muted)', marginTop: 4 }}>
              When refitted on the full training set without early stopping, this overfitted model achieved the worst DNN test accuracy (83.15%) and AUC (0.8771) across all seeds, substantially inflating the DNN replication standard deviation.
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
