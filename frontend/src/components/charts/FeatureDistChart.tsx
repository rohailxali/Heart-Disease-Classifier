import React, { useState, useMemo } from 'react'
import { scaleBand, scaleLinear } from 'd3-scale'
import type { Eda } from '../../schemas'
import { Figure } from '../Figure'
import { SegmentedControl } from '../SegmentedControl'

interface FeatureDistProps {
  eda: Eda
}

const FEATURE_OPTIONS = [
  { key: 'Cholesterol', type: 'num', label: 'Cholesterol (mg/dl)' },
  { key: 'Age', type: 'num', label: 'Age (years)' },
  { key: 'MaxHR', type: 'num', label: 'Max Heart Rate' },
  { key: 'Oldpeak', type: 'num', label: 'ST Depression (Oldpeak)' },
  { key: 'RestingBP', type: 'num', label: 'Resting BP (mm Hg)' },
  { key: 'ST_Slope', type: 'cat', label: 'ST Slope' },
  { key: 'ChestPainType', type: 'cat', label: 'Chest Pain Type' },
  { key: 'ExerciseAngina', type: 'cat', label: 'Exercise Angina' },
  { key: 'Sex', type: 'cat', label: 'Sex' },
] as const

export function FeatureDistChart({ eda }: FeatureDistProps) {
  const [feature, setFeature] = useState<string>('Cholesterol')
  const [stripZeros, setStripZeros] = useState<boolean>(false)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const selectedMeta = FEATURE_OPTIONS.find(f => f.key === feature) ?? FEATURE_OPTIONS[0]

  const bins = useMemo(() => {
    if (selectedMeta.type === 'num') {
      const hist =
        feature === 'Cholesterol' && stripZeros
          ? eda.data_quality.cholesterol_nonzero_hist
          : eda.num_histograms[feature]
      if (!hist) return []
      return hist.healthy.map((hCount, i) => ({
        label: `${Math.round(hist.edges[i])}–${Math.round(hist.edges[i + 1])}`,
        shortLabel: `${Math.round(hist.edges[i])}`,
        healthy: hCount,
        disease: hist.disease[i],
      }))
    } else {
      const cat = eda.cat_counts[feature]
      if (!cat) return []
      return Object.entries(cat).map(([k, v]) => ({
        label: k,
        shortLabel: k,
        healthy: v.healthy,
        disease: v.disease,
      }))
    }
  }, [eda, feature, selectedMeta.type, stripZeros])

  const W = 720
  const H = 260
  const margin = { top: 20, right: 24, bottom: 44, left: 48 }
  const innerW = W - margin.left - margin.right
  const innerH = H - margin.top - margin.bottom

  const maxY = Math.max(10, ...bins.map(b => Math.max(b.healthy, b.disease))) * 1.1
  const xScale = scaleBand<string>().domain(bins.map((_, i) => String(i))).range([0, innerW]).padding(0.2)
  const yScale = scaleLinear().domain([0, maxY]).range([innerH, 0])
  const yTicks = yScale.ticks(5)

  const activeBin = hoveredIdx !== null ? bins[hoveredIdx] : null

  return (
    <Figure
      label="Figure 2.2 · Clinical Feature Distributions"
      title={`${selectedMeta.label} split by outcome`}
      subtitle={
        feature === 'Cholesterol' && !stripZeros
          ? 'Notice the isolated bin at 0 mg/dl — 152 disease vs 20 healthy patients before imputation.'
          : 'Counts across all 918 patients grouped by healthy (green) and heart disease (oxblood).'
      }
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="eda-feature-select" className="sr-only">Feature</label>
          <select
            id="eda-feature-select"
            value={feature}
            onChange={e => { setFeature(e.target.value); setHoveredIdx(null) }}
            className="text-xs font-mono border border-rule bg-surface text-ink rounded-[2px] px-2.5 py-1.5"
          >
            {FEATURE_OPTIONS.map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>

          {feature === 'Cholesterol' && (
            <SegmentedControl
              size="sm"
              name="chol-zeros-filter"
              ariaLabel="Cholesterol zero inclusion"
              value={stripZeros ? 'nonzero' : 'all'}
              onChange={v => setStripZeros(v === 'nonzero')}
              options={[
                { value: 'all', label: 'Include Chol = 0' },
                { value: 'nonzero', label: 'Measured Only (>0)' },
              ]}
            />
          )}
        </div>
      }
      source="Source: heart.csv via eda.json"
      fallback={{
        caption: `${selectedMeta.label} histogram / category counts`,
        headers: ['Bin / Category', 'Healthy (0)', 'Disease (1)', 'Total'],
        rows: bins.map(b => [b.label, b.healthy, b.disease, b.healthy + b.disease]),
      }}
    >
      {/* Inline bin hover bar */}
      <div className="h-5 mb-2 flex items-center justify-between text-xs font-mono text-muted">
        {activeBin ? (
          <span>
            Range <strong className="text-ink">{activeBin.label}</strong>:{' '}
            <span className="text-green font-semibold">{activeBin.healthy} healthy</span> ·{' '}
            <span className="text-oxblood font-semibold">{activeBin.disease} disease</span>
          </span>
        ) : (
          <span>Hover or tap bars to inspect exact bin counts</span>
        )}
        <span className="inline-flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-green inline-block" /> Healthy
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-oxblood inline-block" /> Disease
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Distribution of ${selectedMeta.label} for healthy versus disease patients`}
        className="w-full h-auto overflow-visible"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {yTicks.map(t => (
            <g key={t} transform={`translate(0, ${yScale(t)})`}>
              <line x1={0} x2={innerW} stroke="var(--color-rule)" strokeWidth="0.7" strokeDasharray="2 3" />
              <text x={-8} y={4} textAnchor="end" className="font-mono text-[10px] fill-muted">
                {t}
              </text>
            </g>
          ))}

          {bins.map((b, i) => {
            const bx = xScale(String(i)) ?? 0
            const bw = xScale.bandwidth()
            const subW = Math.max(2, bw / 2 - 1)
            const hH = innerH - yScale(b.healthy)
            const hD = innerH - yScale(b.disease)
            const showTick = bins.length <= 10 || i % 3 === 0 || i === bins.length - 1

            return (
              <g
                key={b.label}
                onMouseEnter={() => setHoveredIdx(i)}
                className="cursor-pointer"
              >
                <rect
                  x={bx}
                  y={yScale(b.healthy)}
                  width={subW}
                  height={Math.max(0, hH)}
                  fill="var(--color-green)"
                  fillOpacity={hoveredIdx === i ? 0.95 : 0.72}
                />
                <rect
                  x={bx + subW + 1}
                  y={yScale(b.disease)}
                  width={subW}
                  height={Math.max(0, hD)}
                  fill="var(--color-oxblood)"
                  fillOpacity={hoveredIdx === i ? 0.95 : 0.78}
                />
                {showTick && (
                  <text
                    x={bx + bw / 2}
                    y={innerH + 16}
                    textAnchor="middle"
                    className="font-mono text-[10px] fill-muted"
                  >
                    {b.shortLabel}
                  </text>
                )}
              </g>
            )
          })}

          <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="var(--color-rule)" strokeWidth="1" />
          <line x1={0} x2={0} y1={0} y2={innerH} stroke="var(--color-rule)" strokeWidth="1" />
        </g>
      </svg>
    </Figure>
  )
}
