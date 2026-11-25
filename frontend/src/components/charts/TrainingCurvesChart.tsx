import React, { useState, useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import { line, area } from 'd3-shape'
import type { Curves } from '../../schemas'
import { SEEDS } from '../../utils'
import { Figure } from '../Figure'
import { SegmentedControl } from '../SegmentedControl'

interface TrainingCurvesProps {
  curves: Curves
}

type CurveMode = 'loss' | 'accuracy'

export function TrainingCurvesChart({ curves }: TrainingCurvesProps) {
  const [seed, setSeed] = useState<string>('44')
  const [mode, setMode] = useState<CurveMode>('loss')
  const [hoverEpochIdx, setHoverEpochIdx] = useState<number | null>(null)

  const curve = curves[seed] || curves['42']

  const points = useMemo(() => {
    return curve.epochs.map((ep, i) => ({
      epoch: ep,
      train: mode === 'loss' ? curve.loss[i] : curve.accuracy[i],
      val: mode === 'loss' ? curve.val_loss[i] : curve.val_accuracy[i],
    }))
  }, [curve, mode])

  const W = 720
  const H = 290
  const margin = { top: 22, right: 30, bottom: 42, left: 56 }
  const innerW = W - margin.left - margin.right
  const innerH = H - margin.top - margin.bottom

  const maxEpoch = curve.epochs[curve.epochs.length - 1] || 20
  const maxVal = mode === 'loss'
    ? Math.max(0.8, ...points.map(p => Math.max(p.train, p.val))) * 1.08
    : 1.02
  const minVal = mode === 'loss'
    ? 0
    : Math.max(0.45, Math.min(...points.map(p => Math.min(p.train, p.val))) - 0.05)

  const xScale = scaleLinear().domain([1, maxEpoch]).range([0, innerW])
  const yScale = scaleLinear().domain([minVal, maxVal]).range([innerH, 0])

  const trainLine = useMemo(() => {
    const gen = line<{ epoch: number; train: number }>()
      .x(d => xScale(d.epoch))
      .y(d => yScale(d.train))
    return gen(points) || ''
  }, [points, xScale, yScale])

  const valLine = useMemo(() => {
    const gen = line<{ epoch: number; val: number }>()
      .x(d => xScale(d.epoch))
      .y(d => yScale(d.val))
    return gen(points) || ''
  }, [points, xScale, yScale])

  // Overfitting gap area shaded oxblood wherever val_loss > train_loss
  const overfitGapPath = useMemo(() => {
    if (mode !== 'loss') return ''
    const gen = area<{ epoch: number; train: number; val: number }>()
      .defined(d => d.val >= d.train)
      .x(d => xScale(d.epoch))
      .y0(d => yScale(d.train))
      .y1(d => yScale(d.val))
    return gen(points) || ''
  }, [mode, points, xScale, yScale])

  // Epoch of minimum validation loss
  const minValLossEpoch = useMemo(() => {
    let bestIdx = 0
    for (let i = 1; i < curve.val_loss.length; i++) {
      if (curve.val_loss[i] < curve.val_loss[bestIdx]) bestIdx = i
    }
    return curve.epochs[bestIdx]
  }, [curve])

  const xTicks = maxEpoch > 30 ? [1, 10, 20, 30, 40, 50] : [1, 5, 10, 15, 20]
  const yTicks = yScale.ticks(5)

  const activePoint = hoverEpochIdx !== null ? points[hoverEpochIdx] : points[points.length - 1]

  return (
    <Figure
      label="Figure 4.3 · DNN Validation Curves"
      title={`Seed ${seed} DNN training trajectory (${curve.epochs.length} epochs, batch ${curve.best_config.batch ?? '—'}, lr ${curve.best_config.lr ?? '—'})`}
      subtitle={curve.note}
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            size="sm"
            name="curve-seed"
            ariaLabel="Select seed training curve"
            value={seed}
            onChange={(s) => { setSeed(String(s)); setHoverEpochIdx(null) }}
            options={SEEDS.map(s => ({ value: String(s), label: `Seed ${s}` }))}
          />
          <SegmentedControl
            size="sm"
            name="curve-mode"
            ariaLabel="Metric mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'loss', label: 'BCE Loss' },
              { value: 'accuracy', label: 'Accuracy' },
            ]}
          />
        </div>
      }
      caption={
        mode === 'loss'
          ? `Oxblood shading highlights validation-loss divergence above training loss. Min val_loss at epoch ${minValLossEpoch}, while grid search selected final epoch ${curve.epochs.length}.`
          : `Final validation accuracy at epoch ${curve.epochs.length}: ${(curve.val_accuracy[curve.val_accuracy.length - 1] * 100).toFixed(1)}%.`
      }
      source={`Source: results_heart/dnn_curve_seed${seed}.csv`}
      fallback={{
        caption: `DNN Tuning Curve Seed ${seed}`,
        headers: ['Epoch', 'Train Loss', 'Val Loss', 'Train Acc', 'Val Acc'],
        rows: curve.epochs.map((ep, i) => [
          ep,
          curve.loss[i].toFixed(4),
          curve.val_loss[i].toFixed(4),
          curve.accuracy[i].toFixed(4),
          curve.val_accuracy[i].toFixed(4),
        ]),
      }}
    >
      {/* Inline epoch scrubber readout */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono mb-3 px-1">
        <div className="flex flex-wrap items-center gap-4">
          <span>
            Epoch <strong className="text-ink">{activePoint.epoch}</strong>/{maxEpoch}
          </span>
          <span className="text-slate">
            Train {mode === 'loss' ? 'loss' : 'acc'}:{' '}
            <strong>{mode === 'loss' ? activePoint.train.toFixed(4) : `${(activePoint.train * 100).toFixed(1)}%`}</strong>
          </span>
          <span className="text-oxblood">
            Val {mode === 'loss' ? 'loss' : 'acc'}:{' '}
            <strong>{mode === 'loss' ? activePoint.val.toFixed(4) : `${(activePoint.val * 100).toFixed(1)}%`}</strong>
          </span>
        </div>
        <span className="text-muted">Min val_loss: epoch {minValLossEpoch}</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`DNN training versus validation ${mode} curves for seed ${seed}`}
        className="w-full h-auto overflow-visible"
        onMouseLeave={() => setHoverEpochIdx(null)}
      >
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Y Grid */}
          {yTicks.map(t => (
            <g key={t} transform={`translate(0, ${yScale(t)})`}>
              <line x1={0} x2={innerW} stroke="var(--color-rule)" strokeWidth="0.7" strokeDasharray="2 3" />
              <text x={-10} y={4} textAnchor="end" className="font-mono text-[10px] fill-muted">
                {mode === 'loss' ? t.toFixed(2) : `${(t * 100).toFixed(0)}%`}
              </text>
            </g>
          ))}

          {/* X Axis ticks */}
          {xTicks.map(t => (
            <g key={t} transform={`translate(${xScale(t)}, ${innerH})`}>
              <line y1={0} y2={5} stroke="var(--color-rule)" strokeWidth="1" />
              <text y={18} textAnchor="middle" className="font-mono text-[10px] fill-muted">
                {t}
              </text>
            </g>
          ))}
          <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="var(--color-rule)" strokeWidth="1" />
          <line x1={0} x2={0} y1={0} y2={innerH} stroke="var(--color-rule)" strokeWidth="1" />

          {/* Overfitting gap fill (val_loss > train_loss) */}
          {overfitGapPath && (
            <path d={overfitGapPath} fill="var(--color-oxblood)" fillOpacity="0.18" />
          )}

          {/* Vertical marker at minimum validation loss */}
          <line
            x1={xScale(minValLossEpoch)}
            x2={xScale(minValLossEpoch)}
            y1={0}
            y2={innerH}
            stroke="var(--color-ochre)"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <text
            x={xScale(minValLossEpoch) + 4}
            y={12}
            className="font-mono text-[10px] fill-ochreInk"
          >
            min val_loss (ep {minValLossEpoch})
          </text>

          {/* Lines */}
          <path d={trainLine} fill="none" stroke="var(--color-slate)" strokeWidth="2.1" />
          <path d={valLine} fill="none" stroke="var(--color-oxblood)" strokeWidth="2.1" />

          {/* Active scrubbed vertical guide + dots */}
          {activePoint && (
            <g transform={`translate(${xScale(activePoint.epoch)}, 0)`}>
              <line y1={0} y2={innerH} stroke="var(--color-ink)" strokeOpacity="0.25" strokeWidth="1" />
              <circle cy={yScale(activePoint.train)} r={4} fill="var(--color-slate)" />
              <circle cy={yScale(activePoint.val)} r={4} fill="var(--color-oxblood)" />
            </g>
          )}

          {/* Invisible hit columns for smooth mouse/keyboard scrubbing */}
          {points.map((p, idx) => {
            const colW = innerW / points.length
            return (
              <rect
                key={p.epoch}
                x={xScale(p.epoch) - colW / 2}
                y={0}
                width={colW}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHoverEpochIdx(idx)}
              />
            )
          })}

          <text
            x={innerW / 2}
            y={innerH + 34}
            textAnchor="middle"
            className="font-mono text-[10px] uppercase tracking-wider fill-muted"
          >
            Training Epoch
          </text>
        </g>
      </svg>

      {/* Interactive epoch scrubber slider for phone & keyboard */}
      <div className="mt-3 flex items-center gap-3">
        <label htmlFor="epoch-scrubber" className="font-mono text-[11px] text-muted whitespace-nowrap">
          Scrub epoch:
        </label>
        <input
          id="epoch-scrubber"
          type="range"
          min={0}
          max={points.length - 1}
          value={hoverEpochIdx ?? points.length - 1}
          onChange={e => setHoverEpochIdx(Number(e.target.value))}
          className="flex-1"
        />
      </div>
    </Figure>
  )
}
