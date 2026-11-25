import React, { useState, useMemo } from 'react'
import { scaleBand, scaleLinear } from 'd3-scale'
import type { CompRow } from '../../schemas'
import { METRIC_LABELS, MODEL_LABELS, fmtZ } from '../../utils'
import { Figure } from '../Figure'
import { SegmentedControl } from '../SegmentedControl'

interface DumbbellProps {
  comparison: CompRow[]
}

const COMP_METRICS = [
  { value: 'accuracy', label: 'Accuracy' },
  { value: 'auc', label: 'ROC-AUC' },
  { value: 'f1_1', label: 'F1 (Disease)' },
  { value: 'precision1', label: 'Prec (Disease)' },
  { value: 'recall1', label: 'Rec (Disease)' },
  { value: 'precision0', label: 'Prec (Healthy)' },
  { value: 'recall0', label: 'Rec (Healthy)' },
  { value: 'f1_0', label: 'F1 (Healthy)' },
]

export function DumbbellChart({ comparison }: DumbbellProps) {
  const [metric, setMetric] = useState<string>('accuracy')
  const [zoomed, setZoomed] = useState<boolean>(false) // Zero-based default per editorial contract

  const rows = useMemo(() => {
    return comparison
      .filter(r => r.metric === metric)
      .sort((a, b) => b.mine - a.mine)
  }, [comparison, metric])

  const minVal = useMemo(() => {
    if (!zoomed) return 0
    const lowest = Math.min(...rows.map(r => Math.min(r.paper, r.mine - r.std)))
    return Math.max(0, Math.floor((lowest - 0.04) * 20) / 20)
  }, [rows, zoomed])

  const W = 740
  const H = 335
  const margin = { top: 22, right: 168, bottom: 44, left: 68 }
  const innerW = W - margin.left - margin.right
  const innerH = H - margin.top - margin.bottom

  const xScale = scaleLinear().domain([minVal, 1.0]).range([0, innerW])
  const yScale = scaleBand<string>().domain(rows.map(r => r.model)).range([0, innerH]).padding(0.26)

  const xTicks = zoomed
    ? xScale.ticks(5).filter(t => t >= minVal && t <= 1.0)
    : [0, 0.2, 0.4, 0.6, 0.8, 1.0]

  const isPctMetric = metric !== 'auc'

  const fmtVal = (v: number) => (isPctMetric ? `${(v * 100).toFixed(1)}%` : v.toFixed(3))

  return (
    <Figure
      label="Figure 5.1 · Paper vs 5-Seed Replication"
      title={`${METRIC_LABELS[metric]} — Reported Single Run vs 5-Seed Mean ± SD`}
      subtitle="Hollow slate circles mark the JAIC 2025 reported score (single run). Filled ochre marks our 5-seed mean with shaded ±1 SD noise band."
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="dumbbell-metric" className="sr-only">Metric</label>
          <select
            id="dumbbell-metric"
            value={metric}
            onChange={e => setMetric(e.target.value)}
            className="text-xs font-mono border border-rule bg-surface text-ink rounded-[2px] px-2.5 py-1.5"
          >
            {COMP_METRICS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <SegmentedControl
            size="sm"
            name="dumbbell-axis"
            ariaLabel="X axis scale"
            value={zoomed ? 'zoom' : 'zero'}
            onChange={v => setZoomed(v === 'zoom')}
            options={[
              { value: 'zero', label: '0–100% Honest' },
              { value: 'zoom', label: 'Zoom //' },
            ]}
          />
        </div>
      }
      caption="When the hollow slate circle sits inside the shaded ochre band, the difference from the paper is within ±1 standard deviation across splits."
      source="Source: comparison.json · Paper: as reported (single run) · Ours: mean ± SD over 5 seeds"
      fallback={{
        caption: `Paper vs Replication (${METRIC_LABELS[metric]})`,
        headers: ['Model', 'Paper (single run)', 'Replication Mean', 'SD', 'Diff', 'Z-score', 'Verdict'],
        rows: rows.map(r => [
          `${r.model} (${MODEL_LABELS[r.model]})`,
          fmtVal(r.paper),
          fmtVal(r.mine),
          isPctMetric ? `±${(r.std * 100).toFixed(2)}%` : `±${r.std.toFixed(4)}`,
          `${r.diff > 0 ? '+' : ''}${(r.diff * 100).toFixed(2)} pp`,
          fmtZ(r.z),
          r.verdict,
        ]),
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Dumbbell comparison plot for ${METRIC_LABELS[metric]}`}
        className="w-full h-auto overflow-visible"
      >
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Vertical grid lines */}
          {xTicks.map(t => (
            <g key={t} transform={`translate(${xScale(t)}, 0)`}>
              <line y1={0} y2={innerH} stroke="var(--color-rule)" strokeWidth="0.7" strokeDasharray="2 3" />
              <text y={innerH + 18} textAnchor="middle" className="font-mono text-[10px] fill-muted">
                {isPctMetric ? `${(t * 100).toFixed(0)}%` : t.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Baseline axis */}
          <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="var(--color-rule)" strokeWidth="1" />

          {/* Explicit axis-break marker when zoomed */}
          {zoomed && (
            <g transform={`translate(10, ${innerH})`}>
              <rect x="-8" y="-5" width="16" height="10" fill="var(--color-bg)" />
              <path d="M -5 5 L -1 -5 M 1 5 L 5 -5" stroke="var(--color-ink)" strokeWidth="1.4" fill="none" />
              <title>Truncated horizontal axis starts at {fmtVal(minVal)}</title>
            </g>
          )}

          {/* Dumbbell rows */}
          {rows.map(r => {
            const bandY = yScale(r.model) ?? 0
            const yMid = bandY + yScale.bandwidth() / 2
            const xPaper = xScale(Math.max(minVal, r.paper))
            const xMine = xScale(Math.max(minVal, r.mine))
            const xLow = xScale(Math.max(minVal, r.mine - r.std))
            const xHigh = xScale(Math.min(1.0, r.mine + r.std))

            const verdictColor =
              r.verdict === 'higher'
                ? 'var(--color-green)'
                : r.verdict === 'lower'
                  ? 'var(--color-oxblood)'
                  : 'var(--color-muted)'

            return (
              <g key={r.model} transform={`translate(0, ${yMid})`}>
                {/* "Within 1 SD" shaded band */}
                <rect
                  x={xLow}
                  y={-12}
                  width={Math.max(2, xHigh - xLow)}
                  height={24}
                  fill="var(--color-ochre)"
                  fillOpacity="0.16"
                />

                {/* ±1 SD whisker */}
                <line x1={xLow} x2={xHigh} y1={0} y2={0} stroke="var(--color-ochre)" strokeWidth="1.8" />
                <line x1={xLow} x2={xLow} y1={-4} y2={4} stroke="var(--color-ochre)" strokeWidth="1.3" />
                <line x1={xHigh} x2={xHigh} y1={-4} y2={4} stroke="var(--color-ochre)" strokeWidth="1.3" />

                {/* Connector line between Paper & Mine */}
                <line
                  x1={xPaper}
                  x2={xMine}
                  y1={0}
                  y2={0}
                  stroke="var(--color-ink)"
                  strokeWidth="1.4"
                  strokeOpacity="0.45"
                  strokeDasharray="2 2"
                />

                {/* Model label */}
                <text x={-12} y={4} textAnchor="end" className="font-mono text-xs font-semibold fill-ink">
                  {r.model}
                </text>

                {/* Filled Ochre dot = Replication */}
                <circle
                  cx={xMine}
                  cy={0}
                  r={5.5}
                  fill="var(--color-ochre)"
                  stroke="var(--color-surface)"
                  strokeWidth="1"
                >
                  <title>Replication ({r.model}): {fmtVal(r.mine)} ± {r.std.toFixed(4)}</title>
                </circle>

                {/* Hollow Slate dot = Paper */}
                <circle
                  cx={xPaper}
                  cy={0}
                  r={5.2}
                  fill="var(--color-surface)"
                  stroke="var(--color-slate)"
                  strokeWidth="2.2"
                >
                  <title>Paper ({r.model}, single run): {fmtVal(r.paper)}</title>
                </circle>

                {/* Two-line right summary: value comparison above, Z-score + verdict below */}
                <text x={innerW + 14} y={-2} className="font-mono text-[11px] fill-ink font-medium">
                  {fmtVal(r.mine)} vs {fmtVal(r.paper)}
                </text>
                <text
                  x={innerW + 14}
                  y={12}
                  fill={verdictColor}
                  className="font-mono text-[10px] font-medium"
                >
                  {fmtZ(r.z)} · {r.verdict}
                </text>
              </g>
            )
          })}

          <text
            x={innerW / 2}
            y={innerH + 34}
            textAnchor="middle"
            className="font-mono text-[10px] uppercase tracking-wider fill-muted"
          >
            {METRIC_LABELS[metric]} ({zoomed ? `truncated from ${fmtVal(minVal)}` : 'zero-based 0–100%'})
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-5 mt-3 text-xs font-mono text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-slate bg-surface inline-block" /> Paper (as reported, single run)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-ochre inline-block" /> Replication (mean ± SD over 5 seeds)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-3 bg-ochre/20 border-x border-ochre inline-block" /> Within ±1 SD band
        </span>
      </div>
    </Figure>
  )
}
