import React, { useState, useMemo } from 'react'
import { scaleBand, scaleLinear } from 'd3-scale'
import { motion, useReducedMotion } from 'framer-motion'
import type { Results, PerSeedRow } from '../../schemas'
import { MODELS, MODEL_LABELS, fmtPct, fmtAUC } from '../../utils'
import { Figure } from '../Figure'
import { SegmentedControl } from '../SegmentedControl'

interface StripPlotProps {
  results: Results
}

type StripMetric = 'accuracy' | 'auc'

const SEED_Y_OFFSETS: Record<number, number> = {
  42: -7,
  43: -3.5,
  44: 0,
  45: 3.5,
  46: 7,
}

export function StripPlotChart({ results }: StripPlotProps) {
  const [metric, setMetric] = useState<StripMetric>('accuracy')
  const [zeroBased, setZeroBased] = useState(false)
  const [hovered, setHovered] = useState<{ row: PerSeedRow; x: number; y: number } | null>(null)
  const reduceMotion = useReducedMotion()

  const rows = useMemo(() => {
    const items = MODELS.map(m => {
      const r = results[m]
      const mean = r.stats[metric]?.mean ?? 0
      const std = r.stats[metric]?.std ?? 0
      return { model: m, mean, std, seeds: r.per_seed }
    })
    return items.sort((a, b) => b.mean - a.mean)
  }, [results, metric])

  const W = 720
  const H = 310
  const margin = { top: 24, right: 122, bottom: 44, left: 68 }
  const innerW = W - margin.left - margin.right
  const innerH = H - margin.top - margin.bottom

  const minDomain = zeroBased ? 0 : 0.76
  const maxDomain = 0.98

  const xScale = scaleLinear()
    .domain([minDomain, maxDomain])
    .range([0, innerW])

  const yScale = scaleBand<string>()
    .domain(rows.map(r => r.model))
    .range([0, innerH])
    .padding(0.28)

  const ticks = zeroBased
    ? [0, 0.2, 0.4, 0.6, 0.8, 0.9, 1.0].filter(t => t <= maxDomain)
    : [0.78, 0.80, 0.84, 0.88, 0.92, 0.96]

  // Locate DNN Seed 44 coordinates for the hand-drawn outlier circle
  const dnnRow = rows.find(r => r.model === 'DNN')
  const dnnSeed44 = dnnRow?.seeds.find(s => s.seed === 44)
  const outlierX = dnnSeed44 ? xScale(metric === 'accuracy' ? dnnSeed44.accuracy : dnnSeed44.auc) : null
  const outlierY = dnnRow ? (yScale('DNN') ?? 0) + yScale.bandwidth() / 2 + SEED_Y_OFFSETS[44] : null

  const fallbackRows = rows.map(r => [
    `${r.model} (${MODEL_LABELS[r.model]})`,
    metric === 'accuracy' ? fmtPct(r.mean, 2) : fmtAUC(r.mean),
    metric === 'accuracy' ? `±${(r.std * 100).toFixed(2)}%` : `±${r.std.toFixed(4)}`,
    ...r.seeds.map(s => (metric === 'accuracy' ? fmtPct(s.accuracy, 1) : fmtAUC(s.auc))),
  ])

  return (
    <Figure
      label="Figure 4.1 · Cross-Seed Variance"
      title={`Per-seed ${metric === 'accuracy' ? 'test accuracy' : 'ROC-AUC'} across all 5 stratified splits`}
      subtitle="Each dot is one held-out test split (184 patients); solid ochre mark shows 5-seed mean ± 1 SD."
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            size="sm"
            name="strip-metric"
            ariaLabel="Strip plot metric"
            value={metric}
            onChange={setMetric}
            options={[
              { value: 'accuracy', label: 'Accuracy' },
              { value: 'auc', label: 'ROC-AUC' },
            ]}
          />
          <button
            type="button"
            onClick={() => setZeroBased(z => !z)}
            className="px-2.5 py-1 text-[11px] font-mono border border-rule bg-surface text-muted hover:text-ink rounded-[2px] transition-colors"
          >
            {zeroBased ? 'Axis: 0–100%' : 'Axis: 76–98% //'}
          </button>
        </div>
      }
      caption="DNN collapses on seed 44 while linear/kernel models stay tightly clustered within ±2 pp."
      source="Source: results_heart/raw.csv · Mean ± SD over 5 seeds (42–46)"
      fallback={{
        caption: `Per-seed ${metric} across 6 models`,
        headers: ['Model', 'Mean', 'SD', 'Seed 42', 'Seed 43', 'Seed 44', 'Seed 45', 'Seed 46'],
        rows: fallbackRows,
      }}
    >
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Per-seed strip plot of ${metric} across 6 models`}
          className="w-full h-auto overflow-visible"
        >
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Vertical grid lines */}
            {ticks.map(t => (
              <g key={t} transform={`translate(${xScale(t)}, 0)`}>
                <line y1={0} y2={innerH} stroke="var(--color-rule)" strokeWidth="0.75" strokeDasharray="2 3" />
                <text
                  y={innerH + 18}
                  textAnchor="middle"
                  className="font-mono text-[10px] fill-muted"
                >
                  {metric === 'accuracy' ? `${(t * 100).toFixed(0)}%` : t.toFixed(2)}
                </text>
              </g>
            ))}

            {/* Axis-break symbol when truncated from zero */}
            {!zeroBased && (
              <g transform={`translate(10, ${innerH})`}>
                <rect x="-8" y="-5" width="16" height="10" fill="var(--color-bg)" />
                <path d="M -5 5 L -1 -5 M 1 5 L 5 -5" stroke="var(--color-ink)" strokeWidth="1.3" fill="none" />
                <title>Axis truncated at {minDomain}</title>
              </g>
            )}

            {/* Baseline x-axis */}
            <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="var(--color-rule)" strokeWidth="1" />

            {/* Model rows */}
            {rows.map((r, rIdx) => {
              const yMid = (yScale(r.model) ?? 0) + yScale.bandwidth() / 2
              const xMean = xScale(r.mean)
              const xLow = xScale(Math.max(minDomain, r.mean - r.std))
              const xHigh = xScale(Math.min(maxDomain, r.mean + r.std))

              return (
                <g key={r.model} transform={`translate(0, ${yMid})`}>
                  {/* Row horizontal hairline */}
                  <line x1={0} x2={innerW} y1={0} y2={0} stroke="var(--color-rule)" strokeWidth="0.6" />

                  {/* Model label */}
                  <text
                    x={-12}
                    y={4}
                    textAnchor="end"
                    className="font-mono text-xs font-semibold fill-ink"
                  >
                    {r.model}
                  </text>

                  {/* SD Whisker */}
                  <line
                    x1={xLow}
                    x2={xHigh}
                    y1={0}
                    y2={0}
                    stroke="var(--color-ochre)"
                    strokeWidth="2.2"
                    strokeOpacity="0.65"
                  />
                  <line x1={xLow} x2={xLow} y1={-5} y2={5} stroke="var(--color-ochre)" strokeWidth="1.5" />
                  <line x1={xHigh} x2={xHigh} y1={-5} y2={5} stroke="var(--color-ochre)" strokeWidth="1.5" />

                  {/* 5 Seed dots */}
                  {r.seeds.map((s) => {
                    const val = metric === 'accuracy' ? s.accuracy : s.auc
                    const cx = xScale(val)
                    const cy = SEED_Y_OFFSETS[s.seed] ?? 0
                    const isOutlier = r.model === 'DNN' && s.seed === 44

                    return (
                      <motion.circle
                        key={s.seed}
                        cx={cx}
                        cy={cy}
                        r={isOutlier ? 4.8 : 4}
                        fill={isOutlier ? 'var(--color-oxblood)' : 'var(--color-slate)'}
                        fillOpacity={isOutlier ? 0.95 : 0.78}
                        stroke="var(--color-surface)"
                        strokeWidth="1"
                        className="cursor-pointer"
                        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.4 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : rIdx * 0.05 }}
                        onMouseEnter={() => setHovered({ row: s, x: cx + margin.left, y: yMid + cy + margin.top })}
                        onMouseLeave={() => setHovered(null)}
                      />
                    )
                  })}

                  {/* Replication Mean vertical diamond/bar */}
                  <rect
                    x={xMean - 1.5}
                    y={-11}
                    width={3}
                    height={22}
                    fill="var(--color-ochre)"
                  />

                  {/* Right summary column: mean ± SD */}
                  <text
                    x={innerW + 12}
                    y={4}
                    className="font-mono text-[11px] fill-ink"
                  >
                    {metric === 'accuracy'
                      ? `${fmtPct(r.mean, 1)} ± ${(r.std * 100).toFixed(1)}`
                      : `${fmtAUC(r.mean)} ± ${r.std.toFixed(3)}`}
                  </text>
                </g>
              )
            })}

            {/* Hand-drawn oxblood oval around DNN Seed 44 outlier */}
            {outlierX !== null && outlierY !== null && (
              <g transform={`translate(${outlierX}, ${outlierY})`} pointerEvents="none">
                <motion.path
                  d="M -14 2 C -15 -10, 12 -13, 15 -2 C 17 9, -8 13, -14 4 Z"
                  fill="none"
                  stroke="var(--color-oxblood)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  initial={{ pathLength: reduceMotion ? 1 : 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.25 }}
                />
                <text
                  x={-16}
                  y={-14}
                  textAnchor={outlierX < 90 ? 'start' : 'end'}
                  className="font-display italic text-[11px] fill-oxblood"
                >
                  Seed 44 outlier ({metric === 'accuracy'
                    ? fmtPct(dnnSeed44!.accuracy, 1)
                    : fmtAUC(dnnSeed44!.auc)})
                </text>
              </g>
            )}

            {/* Axis caption */}
            <text
              x={innerW / 2}
              y={innerH + 36}
              textAnchor="middle"
              className="font-mono text-[10px] uppercase tracking-wider fill-muted"
            >
              {metric === 'accuracy' ? 'Held-out Test Accuracy' : 'ROC-AUC'} (mean over 5 seeds)
            </text>
          </g>
        </svg>

        {/* Floating precision readout on dot hover */}
        {hovered && (
          <div
            className="pointer-events-none absolute z-20 px-2.5 py-1.5 bg-surface border border-ink text-[11px] font-mono text-ink shadow-sm"
            style={{
              left: `${Math.min(Math.max((hovered.x / W) * 100, 10), 82)}%`,
              top: `${Math.max((hovered.y / H) * 100 - 16, 0)}%`,
            }}
          >
            <strong>{hovered.row.model}</strong> · Seed {hovered.row.seed} — Acc{' '}
            {fmtPct(hovered.row.accuracy, 2)}, AUC {fmtAUC(hovered.row.auc)}
          </div>
        )}
      </div>

      {/* Compact legend */}
      <div className="flex flex-wrap items-center gap-5 mt-3 text-xs font-mono text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate inline-block" /> Individual seed (42–46)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-oxblood inline-block" /> DNN Seed 44 outlier
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1 h-3.5 bg-ochre inline-block" /> 5-seed mean &amp; ±1 SD whisker
        </span>
      </div>
    </Figure>
  )
}
