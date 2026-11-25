import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Award, AlertTriangle
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts'
import { useData } from '../useData'
import { Card, Badge } from '../components/Card'
import { SegmentedControl } from '../components/SegmentedControl'
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

  if (loading) return <div className="p-8 text-muted">Loading results...</div>
  if (error || !data) return <div className="p-8 text-rose-400">Error: {error}</div>

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

  // Dynamic derivation of Seed 44 statistics
  const dnnSeed44 = results.DNN.per_seed.find(r => r.seed === 44)
  const dnnMeanAcc = results.DNN.stats.accuracy?.mean ?? 0
  const dnnSeed44Acc = dnnSeed44?.accuracy ?? 0
  const dnnSeed44Auc = dnnSeed44?.auc ?? 0

  const c44 = curves['44']
  let minLoss = 0.32
  let minEpoch = 3
  let maxLoss = 1.56
  let maxEpoch = 50
  if (c44 && c44.val_loss.length > 0) {
    minLoss = Math.min(...c44.val_loss)
    minEpoch = c44.val_loss.indexOf(minLoss) + 1
    maxLoss = Math.max(...c44.val_loss)
    maxEpoch = c44.val_loss.indexOf(maxLoss) + 1
  }

  const lossEscalationPct = minLoss > 0 ? Math.round(((maxLoss - minLoss) / minLoss) * 100) : 0

  const seed44Stats = {
    testAcc: (dnnSeed44Acc * 100).toFixed(2),
    meanAcc: (dnnMeanAcc * 100).toFixed(2),
    testAuc: dnnSeed44Auc.toFixed(4),
    minLoss: minLoss.toFixed(3),
    minEpoch,
    maxLoss: maxLoss.toFixed(3),
    maxEpoch,
    lossEscalationPct,
    batch: c44?.best_config.batch ?? 16,
    lr: c44?.best_config.lr ?? 0.01,
    epochs: c44?.best_config.epochs ?? 50,
  }

  return (
    <div className="max-w-[1240px] mx-auto px-5 py-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <div className="flex gap-2 items-center mb-2">
          <Badge variant="info">Empirical Results</Badge>
          <Badge variant="default">5 Seeds (42–46)</Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight mb-2">
          Model Benchmark Leaderboard & Error Analysis
        </h1>
        <p className="text-sm text-muted max-w-3xl leading-relaxed">
          Comprehensive evaluation of all 6 models across 5 random seeds (734 train, 184 test patients per seed). Explore performance metrics, per-seed dispersion, confusion matrices, and DNN convergence dynamics.
        </p>
      </motion.div>

      {/* Sortable Leaderboard */}
      <Card className="mb-7">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2.5">
          <div>
            <h3 className="text-base font-bold text-text">
              Replication Performance Leaderboard (Mean ± SD)
            </h3>
            <p className="text-xs text-muted">
              Click column headers to sort. Best value per metric highlighted in green.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Award size={15} className="text-emerald-400" /> Best in class
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-elevated/60 text-muted uppercase font-semibold">
                <th className="py-3 px-3">Model</th>
                <th
                  onClick={() => handleSort('accuracy')}
                  className="py-3 px-3 cursor-pointer hover:text-text"
                >
                  Accuracy {sortField === 'accuracy' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('auc')}
                  className="py-3 px-3 cursor-pointer hover:text-text"
                >
                  AUC {sortField === 'auc' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('precision0')}
                  className="py-3 px-3 cursor-pointer hover:text-text"
                >
                  Prec (0) {sortField === 'precision0' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('recall0')}
                  className="py-3 px-3 cursor-pointer hover:text-text"
                >
                  Recall (0) {sortField === 'recall0' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('f1_0')}
                  className="py-3 px-3 cursor-pointer hover:text-text"
                >
                  F1 (0) {sortField === 'f1_0' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('precision1')}
                  className="py-3 px-3 cursor-pointer hover:text-text"
                >
                  Prec (1) {sortField === 'precision1' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('recall1')}
                  className="py-3 px-3 cursor-pointer hover:text-text"
                >
                  Recall (1) {sortField === 'recall1' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('f1_1')}
                  className="py-3 px-3 cursor-pointer hover:text-text"
                >
                  F1 (1) {sortField === 'f1_1' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('cv_acc')}
                  className="py-3 px-3 cursor-pointer hover:text-text"
                >
                  CV Acc {sortField === 'cv_acc' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sortedLeaderboard.map((row) => (
                <tr key={row.model} className="hover:bg-elevated/40 transition-colors">
                  <td className="py-3 px-3 font-bold text-text">
                    {row.model} <span className="font-normal text-muted">({row.name})</span>
                  </td>
                  <td className={`py-3 px-3 font-mono ${row.accuracy === bestValues.accuracy ? 'text-emerald-400 font-bold' : ''}`}>
                    {fmtPct(row.accuracy)} ± {(row.accuracy_std * 100).toFixed(2)}
                  </td>
                  <td className={`py-3 px-3 font-mono ${row.auc === bestValues.auc ? 'text-emerald-400 font-bold' : ''}`}>
                    {fmtAUC(row.auc)} ± {row.auc_std.toFixed(4)}
                  </td>
                  <td className={`py-3 px-3 font-mono ${row.precision0 === bestValues.precision0 ? 'text-emerald-400 font-bold' : ''}`}>
                    {fmtPct(row.precision0)}
                  </td>
                  <td className={`py-3 px-3 font-mono ${row.recall0 === bestValues.recall0 ? 'text-emerald-400 font-bold' : ''}`}>
                    {fmtPct(row.recall0)}
                  </td>
                  <td className={`py-3 px-3 font-mono ${row.f1_0 === bestValues.f1_0 ? 'text-emerald-400 font-bold' : ''}`}>
                    {fmtPct(row.f1_0)}
                  </td>
                  <td className={`py-3 px-3 font-mono ${row.precision1 === bestValues.precision1 ? 'text-emerald-400 font-bold' : ''}`}>
                    {fmtPct(row.precision1)}
                  </td>
                  <td className={`py-3 px-3 font-mono ${row.recall1 === bestValues.recall1 ? 'text-emerald-400 font-bold' : ''}`}>
                    {fmtPct(row.recall1)}
                  </td>
                  <td className={`py-3 px-3 font-mono ${row.f1_1 === bestValues.f1_1 ? 'text-emerald-400 font-bold' : ''}`}>
                    {fmtPct(row.f1_1)}
                  </td>
                  <td className={`py-3 px-3 font-mono ${row.cv_acc && row.cv_acc === bestValues.cv_acc ? 'text-emerald-400 font-bold' : 'text-muted'}`}>
                    {row.cv_acc ? fmtPct(row.cv_acc) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Two Column Grid: Confusion Matrix & Hyperparameters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-7">
        {/* Interactive Confusion Matrix */}
        <Card>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-text">Interactive Confusion Matrix</h3>
              <p className="text-xs text-muted">Examine error distribution (False Negatives vs False Positives)</p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {MODELS.map((m) => (
                <button
                  key={m}
                  onClick={() => setCmModel(m)}
                  className={`px-2 py-1 text-xs font-semibold rounded-md border transition-colors ${
                    cmModel === m
                      ? 'border-teal bg-teal/15 text-teal'
                      : 'border-border text-muted hover:text-text'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Seed Selector & Mode Toggle */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex gap-1">
              {(['pooled', 42, 43, 44, 45, 46] as const).map((s) => (
                <button
                  key={String(s)}
                  onClick={() => setCmSeed(s)}
                  className={`px-2 py-0.5 text-xs font-medium rounded border transition-colors ${
                    cmSeed === s
                      ? 'border-teal bg-teal/15 text-teal'
                      : 'border-border text-muted hover:text-text'
                  }`}
                >
                  {s === 'pooled' ? 'Pooled (5 seeds)' : `Seed ${s}`}
                </button>
              ))}
            </div>

            <SegmentedControl
              options={[
                { value: 'counts', label: 'Counts' },
                { value: 'percent', label: 'Percentages' },
              ]}
              value={cmMode}
              onChange={(val) => setCmMode(val as 'counts' | 'percent')}
              size="sm"
            />
          </div>

          {/* 2x2 Matrix Display */}
          <div className="max-w-[340px] mx-auto py-2">
            <div className="grid grid-cols-[70px_1fr_1fr] gap-2 items-center">
              <div />
              <div className="text-center text-xs font-bold text-text">Pred Healthy (0)</div>
              <div className="text-center text-xs font-bold text-text">Pred Disease (1)</div>

              {/* Row 1: Actual Healthy */}
              <div className="text-xs font-bold text-text">Actual Healthy (0)</div>
              <div className="bg-teal/15 border border-teal/30 rounded-lg p-3.5 text-center">
                <div className="text-[10px] text-teal font-bold tracking-wider">TRUE NEG</div>
                <div className="text-xl font-extrabold font-mono text-text mt-0.5">
                  {formatCMCell(activeCM.TN, actualHealthy)}
                </div>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/25 rounded-lg p-3.5 text-center">
                <div className="text-[10px] text-rose-400 font-bold tracking-wider">FALSE POS</div>
                <div className="text-xl font-extrabold font-mono text-text mt-0.5">
                  {formatCMCell(activeCM.FP, actualHealthy)}
                </div>
              </div>

              {/* Row 2: Actual Disease */}
              <div className="text-xs font-bold text-text">Actual Disease (1)</div>
              <div className="bg-rose-500/10 border border-rose-500/25 rounded-lg p-3.5 text-center">
                <div className="text-[10px] text-rose-400 font-bold tracking-wider">FALSE NEG</div>
                <div className="text-xl font-extrabold font-mono text-text mt-0.5">
                  {formatCMCell(activeCM.FN, actualDisease)}
                </div>
              </div>
              <div className="bg-teal/15 border border-teal/30 rounded-lg p-3.5 text-center">
                <div className="text-[10px] text-teal font-bold tracking-wider">TRUE POS</div>
                <div className="text-xl font-extrabold font-mono text-text mt-0.5">
                  {formatCMCell(activeCM.TP, actualDisease)}
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex justify-around mt-4 pt-3 border-t border-border text-xs">
              <div>
                <span className="text-muted">Specificity: </span>
                <span className="font-bold text-text">
                  {actualHealthy > 0 ? `${((activeCM.TN / actualHealthy) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
              <div>
                <span className="text-muted">Sensitivity: </span>
                <span className="font-bold text-text">
                  {actualDisease > 0 ? `${((activeCM.TP / actualDisease) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Hyperparameter Stability Table */}
        <Card>
          <h3 className="text-base font-bold text-text mb-1">Hyperparameter Stability Across Seeds</h3>
          <p className="text-xs text-muted mb-3">
            Best configuration selected by 5-fold CV grid search per seed (or validation split for DNN)
          </p>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-elevated/60 text-muted">
                  <th className="py-2 px-2 text-left">Model</th>
                  <th className="py-2 px-2 text-center">Seed 42</th>
                  <th className="py-2 px-2 text-center">Seed 43</th>
                  <th className="py-2 px-2 text-center">Seed 44</th>
                  <th className="py-2 px-2 text-center">Seed 45</th>
                  <th className="py-2 px-2 text-center">Seed 46</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {MODELS.map((m) => {
                  const mParams = params[m] || []
                  return (
                    <tr key={m} className="hover:bg-elevated/40">
                      <td className="py-2 px-2 font-bold text-text">{m}</td>
                      {[42, 43, 44, 45, 46].map((seed) => {
                        const seedConfig = mParams.find((p) => p.seed === seed) || {}
                        const cleanPairs = Object.entries(seedConfig)
                          .filter(([k]) => k !== 'seed' && k !== 'model')
                          .map(([k, v]) => `${k}=${v}`)
                          .join(', ')

                        return (
                          <td key={seed} className="py-2 px-2 font-mono text-[10px] text-muted text-center leading-tight">
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
          <div className="text-[11px] text-muted mt-3">
            <b>Observation:</b> SVM consistently selects <code className="text-teal">C=1.0, rbf</code> across 4 of 5 seeds (linear only on seed 43). Random Forest always selects <code className="text-teal">max_features=sqrt</code>.
          </div>
        </Card>
      </div>

      {/* DNN Training Convergence & Overfitting Analysis */}
      <Card>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-text">
                DNN Training Curves (Tuning Phase Validation Dynamics)
              </h3>
              {curveSeed === 44 && (
                <Badge variant="danger">Overfitting Outlier Identified</Badge>
              )}
            </div>
            <p className="text-xs text-muted">
              Evaluated during hyperparameter selection on an 80:20 validation split of the training set (no early stopping)
            </p>
          </div>

          {/* Seed Selector & Metric Toggle */}
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex gap-1">
              {[42, 43, 44, 45, 46].map((s) => (
                <button
                  key={s}
                  onClick={() => setCurveSeed(s)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                    curveSeed === s
                      ? s === 44
                        ? 'border-rose-500 bg-rose-500/15 text-rose-400'
                        : 'border-teal bg-teal/15 text-teal'
                      : 'border-border text-muted hover:text-text'
                  }`}
                >
                  Seed {s} {s === 44 ? '⚠' : ''}
                </button>
              ))}
            </div>

            <SegmentedControl
              options={[
                { value: 'loss', label: 'Loss' },
                { value: 'accuracy', label: 'Accuracy' },
              ]}
              value={curveMetric}
              onChange={(val) => setCurveMetric(val as 'loss' | 'accuracy')}
              size="sm"
            />
          </div>
        </div>

        {/* Selected Config Info */}
        <div className="flex gap-4 mb-4 text-xs bg-elevated p-2.5 rounded-xl border border-border">
          <div>
            <span className="text-muted">Chosen Architecture: </span>
            <b className="text-text">Batch={activeCurve?.best_config.batch}, LR={activeCurve?.best_config.lr}, Epochs={activeCurve?.best_config.epochs}</b>
          </div>
          <div>
            <span className="text-muted">Selection Criterion: </span>
            <span className="text-amber">Last-epoch validation accuracy (no early stopping)</span>
          </div>
        </div>

        {/* Line Chart */}
        <div className="h-[280px] w-full">
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

        {/* Dynamic Annotation Box for Seed 44 */}
        {curveSeed === 44 && (
          <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs leading-relaxed space-y-1.5">
            <div className="font-bold text-rose-400 flex items-center gap-1.5 text-sm">
              <AlertTriangle size={16} /> Detailed Finding: Seed 44 Validation Loss Divergence
            </div>
            <p className="text-text">
              For seed 44, the grid search selected <code className="text-rose-400 font-mono">batch={seed44Stats.batch}, lr={seed44Stats.lr}, epochs={seed44Stats.epochs}</code> based on last-epoch validation accuracy. While training loss declined smoothly, validation loss bottomed at epoch {seed44Stats.minEpoch} ({seed44Stats.minLoss}) and escalated by <b>+{seed44Stats.lossEscalationPct}% to {seed44Stats.maxLoss}</b> around epoch {seed44Stats.maxEpoch}, beginning its clear divergence after epoch ~12.
            </p>
            <p className="text-muted">
              When evaluated on the held-out test split, this overfitted model achieved a test accuracy of <b>{seed44Stats.testAcc}%</b> (compared to the 5-seed mean of {seed44Stats.meanAcc}%) and AUC of <b>{seed44Stats.testAuc}</b>, which accounts for the high variance observed in the DNN replication metrics.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
