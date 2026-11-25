import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Copy, Download, Check, Minus, ArrowUpRight, ArrowDownRight, Info
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend, ErrorBar
} from 'recharts'
import { useData } from '../useData'
import { Card, Badge } from '../components/Card'
import { TableFallback } from '../components/TableFallback'
import { MODEL_LABELS, METRIC_LABELS } from '../utils'

const AVAILABLE_METRICS = [
  { id: 'accuracy', label: 'Accuracy' },
  { id: 'auc', label: 'ROC-AUC' },
  { id: 'precision0', label: 'Precision (Healthy)' },
  { id: 'precision1', label: 'Precision (Disease)' },
  { id: 'recall0', label: 'Recall (Healthy)' },
  { id: 'recall1', label: 'Recall (Disease)' },
  { id: 'f1_0', label: 'F1 Score (Healthy)' },
  { id: 'f1_1', label: 'F1 Score (Disease)' },
]

export default function Comparison() {
  const { data, loading, error } = useData()
  const [selectedMetric, setSelectedMetric] = useState<string>('accuracy')
  const [zoomAxis, setZoomAxis] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)

  if (loading) return <div style={{ padding: 32, color: 'var(--muted)' }}>Loading comparative data...</div>
  if (error || !data) return <div style={{ padding: 32, color: '#FB7185' }}>Error: {error}</div>

  const { comparison } = data

  // Filter comparison data for the selected metric
  const metricComp = comparison.filter((c) => c.metric === selectedMetric)

  // Chart data with error bars
  const chartData = metricComp.map((c) => {
    const isPct = c.metric !== 'auc'
    const paperVal = isPct ? Number((c.paper * 100).toFixed(2)) : Number(c.paper.toFixed(3))
    const mineVal = isPct ? Number((c.mine * 100).toFixed(2)) : Number(c.mine.toFixed(3))
    const stdVal = isPct ? Number((c.std * 100).toFixed(2)) : Number(c.std.toFixed(3))

    return {
      model: c.model,
      name: MODEL_LABELS[c.model] || c.model,
      paper: paperVal,
      mine: mineVal,
      error: stdVal,
      diff: c.diff,
      z: c.z,
      verdict: c.verdict,
    }
  })

  // Copy as Markdown
  const copyAsMarkdown = () => {
    let md = `| Model | Metric | Paper (Single Run) | Replication (Mean ± SD) | Diff | Z-Score | Verdict |\n`
    md += `| :--- | :--- | :---: | :---: | :---: | :---: | :---: |\n`
    comparison.forEach((c) => {
      const isPct = c.metric !== 'auc'
      const pStr = isPct ? `${(c.paper * 100).toFixed(1)}%` : c.paper.toFixed(3)
      const mStr = isPct ? `${(c.mine * 100).toFixed(1)}% ± ${(c.std * 100).toFixed(1)}%` : `${c.mine.toFixed(3)} ± ${c.std.toFixed(3)}`
      const dStr = isPct ? `${c.diff > 0 ? '+' : ''}${(c.diff * 100).toFixed(2)} pp` : `${c.diff > 0 ? '+' : ''}${c.diff.toFixed(3)}`
      const zStr = c.z !== null ? c.z.toFixed(2) : 'N/A'
      md += `| ${c.model} | ${METRIC_LABELS[c.metric] || c.metric} | ${pStr} | ${mStr} | ${dStr} | ${zStr} | ${c.verdict} |\n`
    })

    navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Download CSV
  const downloadCSV = () => {
    let csv = 'model,metric,paper,mine,std,diff,z,verdict\n'
    comparison.forEach((c) => {
      csv += `${c.model},${c.metric},${c.paper},${c.mine},${c.std},${c.diff},${c.z ?? ''},${c.verdict}\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'replication_vs_paper_comparison.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <Badge variant="info">Comparative Study</Badge>
          <Badge variant="default">Simanjuntak et al. (2025)</Badge>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
          Paper Reported vs. Empirical Replication
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, maxWidth: 880 }}>
          Direct statistical comparison between the published paper's single-run figures and our 5-seed stratified replication. Interactive metric selector, zoom controls, and exportable data tables for research reports.
        </p>
      </motion.div>

      {/* Main Grouped Bar Chart */}
      <Card style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          {/* Metric Selector Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {AVAILABLE_METRICS.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMetric(m.id)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: '1px solid',
                  borderColor: selectedMetric === m.id ? 'var(--teal)' : 'var(--border)',
                  background: selectedMetric === m.id ? 'rgba(45,212,191,0.15)' : 'transparent',
                  color: selectedMetric === m.id ? 'var(--teal)' : 'var(--muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Zoom Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {zoomAxis && (
              <Badge variant="warning">
                ⚠ Axis Truncated ({selectedMetric === 'auc' ? 'starts at 0.60' : 'starts at 60%'})
              </Badge>
            )}
            <button
              onClick={() => setZoomAxis(!zoomAxis)}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: zoomAxis ? 'var(--elevated)' : 'transparent',
                color: zoomAxis ? 'var(--amber)' : 'var(--text)',
                cursor: 'pointer',
              }}
            >
              {zoomAxis ? 'Reset Axis (0)' : 'Zoom In Axis'}
            </button>
          </div>
        </div>

        {/* Grouped Bar Chart Container */}
        <div style={{ height: 340, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="model" stroke="var(--muted)" fontSize={12} tickLine={false} />
              <YAxis
                domain={
                  selectedMetric === 'auc'
                    ? (zoomAxis ? [0.60, 1.0] : [0, 1.0])
                    : (zoomAxis ? [60, 100] : [0, 100])
                }
                stroke="var(--muted)"
                fontSize={11}
                tickFormatter={(v) => (selectedMetric === 'auc' ? v.toFixed(2) : `${v}%`)}
                tickLine={false}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload
                    const isPct = selectedMetric !== 'auc'
                    const unit = isPct ? '%' : ''
                    return (
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 8, fontSize: 12 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                          {d.name} ({d.model})
                        </div>
                        <div style={{ color: '#7FA6D6', marginBottom: 2 }}>
                          Paper (single run): <b>{d.paper}{unit}</b>
                        </div>
                        <div style={{ color: '#F59E0B', marginBottom: 4 }}>
                          Replication (mean ± SD): <b>{d.mine}{unit} ± {d.error}{unit}</b>
                        </div>
                        <div style={{ paddingTop: 4, borderTop: '1px solid var(--border)', display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ color: 'var(--muted)' }}>Diff:</span>
                          <span style={{ fontWeight: 700, color: d.verdict === 'higher' ? '#34D399' : d.verdict === 'lower' ? '#FB7185' : 'var(--text)' }}>
                            {d.diff > 0 ? '+' : ''}{isPct ? `${(d.diff * 100).toFixed(2)} pp` : d.diff.toFixed(3)}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            ({d.verdict})
                          </span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                formatter={(value) => (value === 'paper' ? 'Paper (as reported, single run)' : 'Replication (mean ± SD, 5 seeds)')}
              />
              <Bar dataKey="paper" name="paper" fill="#7FA6D6" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="mine" name="mine" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={36}>
                <ErrorBar dataKey="error" width={4} strokeWidth={2} stroke="#B45309" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <TableFallback
          caption={`Paper vs replication for ${selectedMetric}`}
          headers={['Model', 'Paper Value', 'Replication Mean', 'Replication SD', 'Verdict']}
          rows={chartData.map(d => [d.model, d.paper, d.mine, d.error, d.verdict])}
        />
      </Card>

      {/* Diff Table & Actions */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Statistical Discrepancy & Z-Score Analysis Table
            </h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
              Evaluating whether deviations fall within experimental noise (|diff| ≤ 1 SD)
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={copyAsMarkdown}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', fontSize: 12, fontWeight: 600,
                borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--elevated)', color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={14} color="#34D399" /> : <Copy size={14} />}
              {copied ? 'Copied Markdown!' : 'Copy as Markdown'}
            </button>
            <button
              onClick={downloadCSV}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', fontSize: 12, fontWeight: 600,
                borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--elevated)', color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              <Download size={14} /> Download CSV
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 780 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>Model</th>
                <th style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>Metric</th>
                <th style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>Paper (Single Run)</th>
                <th style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>Replication (Mean ± SD)</th>
                <th style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>Difference</th>
                <th style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>Z-Score (diff / SD)</th>
                <th style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((c) => {
                const isPct = c.metric !== 'auc'
                const pStr = isPct ? `${(c.paper * 100).toFixed(1)}%` : c.paper.toFixed(3)
                const mStr = isPct ? `${(c.mine * 100).toFixed(1)}% ± ${(c.std * 100).toFixed(1)}%` : `${c.mine.toFixed(3)} ± ${c.std.toFixed(3)}`
                const diffStr = isPct ? `${c.diff > 0 ? '+' : ''}${(c.diff * 100).toFixed(2)} pp` : `${c.diff > 0 ? '+' : ''}${c.diff.toFixed(3)}`

                // Chip variant
                let chipBg = 'rgba(148,163,184,0.1)'
                let chipColor = 'var(--muted)'
                let chipBorder = 'rgba(148,163,184,0.2)'
                let Icon = Minus

                if (c.verdict === 'higher') {
                  chipBg = 'rgba(52,211,153,0.12)'
                  chipColor = '#34D399'
                  chipBorder = 'rgba(52,211,153,0.3)'
                  Icon = ArrowUpRight
                } else if (c.verdict === 'lower') {
                  chipBg = 'rgba(251,113,133,0.12)'
                  chipColor = '#FB7185'
                  chipBorder = 'rgba(251,113,133,0.3)'
                  Icon = ArrowDownRight
                }

                return (
                  <tr
                    key={`${c.model}-${c.metric}`}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      fontSize: 13,
                      fontFamily: 'JetBrains Mono, monospace',
                      background: c.metric === selectedMetric ? 'rgba(45,212,191,0.03)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}>
                      {c.model}
                    </td>
                    <td style={{ padding: '9px 12px', color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}>
                      {METRIC_LABELS[c.metric] || c.metric}
                    </td>
                    <td style={{ padding: '9px 12px', color: '#7FA6D6' }}>{pStr}</td>
                    <td style={{ padding: '9px 12px', color: '#F59E0B' }}>{mStr}</td>
                    <td style={{ padding: '9px 12px', color: c.diff > 0 ? '#34D399' : c.diff < 0 ? '#FB7185' : 'var(--text)' }}>
                      {diffStr}
                    </td>
                    <td style={{ padding: '9px 12px', color: 'var(--muted)' }}>
                      {c.z !== null ? c.z.toFixed(2) : 'N/A'}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          background: chipBg,
                          color: chipColor,
                          border: `1px solid ${chipBorder}`,
                          fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        <Icon size={12} />
                        {c.verdict}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Statistical Footnote Note */}
        <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--elevated)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <Info size={16} color="var(--teal)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <b>Methodological note on test sensitivity:</b> With a test set size of N = 184, each individual patient outcome accounts for exactly <b>0.5435 percentage points</b> (1 / 184). Consequently, differences of ±1 to 2 percentage points cannot be interpreted as meaningful algorithmic superiority; they fall well within standard sampling variance. Furthermore, because the original paper published only a single train-test run without reporting standard deviations, the true variance of their benchmark is unknown.
          </div>
        </div>
      </Card>
    </div>
  )
}
