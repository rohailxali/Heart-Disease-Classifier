import React, { useState, useMemo } from 'react'
import type { Results } from '../../schemas'
import { MODELS, SEEDS, MODEL_LABELS, fmtPct } from '../../utils'
import { Figure } from '../Figure'
import { SegmentedControl } from '../SegmentedControl'

interface ConfusionDotsProps {
  results: Results
  onePatientPct: number
}

interface PatientCellDot {
  id: number
  cx: number
  cy: number
  fill: string
  stroke: string
  quadrant: 'TN' | 'FP' | 'FN' | 'TP'
}

export function ConfusionDotsViz({ results, onePatientPct }: ConfusionDotsProps) {
  const [selectedModel, setSelectedModel] = useState<string>('SVM')
  const [selectedSeed, setSelectedSeed] = useState<number>(42)
  const [flipDelta, setFlipDelta] = useState<number>(0)

  const cm = useMemo(() => {
    const modelRes = results[selectedModel]
    return modelRes.confusion_per_seed.find(c => c.seed === selectedSeed) ?? modelRes.confusion_per_seed[0]
  }, [results, selectedModel, selectedSeed])

  const total = cm.TN + cm.FP + cm.FN + cm.TP
  const maxFlips = Math.min(4, cm.FP + cm.FN)
  const effectiveFlip = Math.max(-4, Math.min(maxFlips, flipDelta))
  const baseCorrect = cm.TN + cm.TP
  const simulatedCorrect = Math.max(0, Math.min(total, baseCorrect + effectiveFlip))
  const baseAcc = baseCorrect / total
  const simulatedAcc = simulatedCorrect / total

  // Layout parameters for 2x2 quadrants inside 680 x 320 SVG
  const dots: PatientCellDot[] = useMemo(() => {
    const out: PatientCellDot[] = []
    const cols = 12
    const gap = 11.5

    // Quadrant origins:
    // Top-left: TN (Healthy OK), Top-right: FP (False alarm)
    // Bottom-left: FN (Missed disease), Bottom-right: TP (Disease caught)
    const placeCluster = (
      count: number,
      ox: number,
      oy: number,
      quadrant: 'TN' | 'FP' | 'FN' | 'TP',
      fill: string,
      stroke: string,
      startIdx: number
    ) => {
      for (let i = 0; i < count; i++) {
        const col = i % cols
        const row = Math.floor(i / cols)
        out.push({
          id: startIdx + i,
          cx: ox + col * gap,
          cy: oy + row * gap,
          fill,
          stroke,
          quadrant,
        })
      }
    }

    let idx = 0
    placeCluster(cm.TN, 36, 44, 'TN', 'var(--color-green)', 'var(--color-green)', idx)
    idx += cm.TN
    placeCluster(cm.FP, 368, 44, 'FP', 'transparent', 'var(--color-ochre)', idx)
    idx += cm.FP
    placeCluster(cm.FN, 36, 198, 'FN', 'transparent', 'var(--color-oxblood)', idx)
    idx += cm.FN
    placeCluster(cm.TP, 368, 198, 'TP', 'var(--color-oxblood)', 'var(--color-oxblood)', idx)

    return out
  }, [cm])

  // Compare SVM, LR, RF means from results.json
  const svmAcc = results.SVM.stats.accuracy.mean ?? 0
  const rfAcc = results.RF.stats.accuracy.mean ?? 0
  const top3SpreadPp = (svmAcc - rfAcc) * 100

  return (
    <Figure
      label="Figure 4.2 · 184 Test Patients Per Seed"
      title={`One dot = one patient in the Seed ${selectedSeed} test split (${selectedModel})`}
      subtitle={`Each split holds ${total} unseen patients. A single flipped diagnosis shifts accuracy by ${onePatientPct.toFixed(2)} percentage points.`}
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            size="sm"
            name="cm-model"
            ariaLabel="Select model"
            value={selectedModel}
            onChange={(m) => { setSelectedModel(m); setFlipDelta(0) }}
            options={MODELS.map(m => ({ value: m, label: m }))}
          />
          <SegmentedControl
            size="sm"
            name="cm-seed"
            ariaLabel="Select random seed"
            value={selectedSeed}
            onChange={(s) => { setSelectedSeed(Number(s)); setFlipDelta(0) }}
            options={SEEDS.map(s => ({ value: s, label: `${s}` }))}
          />
        </div>
      }
      caption={`In our 5-seed mean, ${top3SpreadPp.toFixed(2)} pp separates #1 SVM from #3 RF — narrower than a single patient out of 184.`}
      source={`Source: results_heart/raw.csv · ${MODEL_LABELS[selectedModel]} · Seed ${selectedSeed}`}
      fallback={{
        caption: `${selectedModel} Seed ${selectedSeed} Confusion Counts (n=${total})`,
        headers: ['True Negative (TN)', 'False Positive (FP)', 'False Negative (FN)', 'True Positive (TP)', 'Accuracy'],
        rows: [[cm.TN, cm.FP, cm.FN, cm.TP, fmtPct(baseAcc, 2)]],
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* 2x2 Quadrant Dot Field */}
        <div className="lg:col-span-8">
          <svg
            viewBox="0 0 680 340"
            role="img"
            aria-label={`${total} patient dots grouped into True Negative (${cm.TN}), False Positive (${cm.FP}), False Negative (${cm.FN}), and True Positive (${cm.TP})`}
            className="w-full h-auto"
          >
            {/* Crosshair dividers */}
            <line x1="340" x2="340" y1="16" y2="332" stroke="var(--color-rule)" strokeWidth="1" />
            <line x1="16" x2="664" y1="172" y2="172" stroke="var(--color-rule)" strokeWidth="1" />

            {/* Quadrant headers */}
            <text x="36" y="28" className="font-mono text-[11px] font-semibold fill-green">
              TRUE NEGATIVE · {cm.TN} healthy cleared
            </text>
            <text x="368" y="28" className="font-mono text-[11px] font-semibold fill-ochreInk">
              FALSE POSITIVE · {cm.FP} false alarms
            </text>
            <text x="36" y="186" className="font-mono text-[11px] font-semibold fill-oxblood">
              FALSE NEGATIVE · {cm.FN} missed disease
            </text>
            <text x="368" y="186" className="font-mono text-[11px] font-semibold fill-oxblood">
              TRUE POSITIVE · {cm.TP} disease detected
            </text>

            {/* 184 Patient Dots */}
            {dots.map((d) => (
              <circle
                key={d.id}
                cx={0}
                cy={0}
                r={3.8}
                fill={d.fill}
                stroke={d.stroke}
                strokeWidth="1.5"
                className="patient-dot"
                style={{ transform: `translate(${d.cx}px, ${d.cy}px)` }}
              />
            ))}
          </svg>
        </div>

        {/* Right Side: Interactive "1 Dot = 0.54 pp" Calculator */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-rule pt-4 lg:pt-0 lg:pl-6 space-y-4">
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted">
            One Dot Resolution Test
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted">Seed {selectedSeed} correct</span>
              <span className="font-mono text-sm text-ink font-semibold">
                {simulatedCorrect} / {total}
              </span>
            </div>
            <div className="numeral text-4xl text-ink mt-1">
              {fmtPct(simulatedAcc, 2)}
            </div>
            {effectiveFlip !== 0 && (
              <div className="font-mono text-xs text-ochreInk mt-1">
                {effectiveFlip > 0 ? '+' : ''}{effectiveFlip} patient{Math.abs(effectiveFlip) > 1 ? 's' : ''} ({effectiveFlip > 0 ? '+' : ''}{(effectiveFlip * onePatientPct).toFixed(2)} pp vs {fmtPct(baseAcc, 2)})
              </div>
            )}
          </div>

          <p className="text-xs text-muted leading-relaxed">
            Toggle single patient outcomes to feel test-set discreteness ({onePatientPct.toFixed(2)} pp per patient):
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFlipDelta(d => Math.max(-4, d - 1))}
              className="px-3 py-1.5 text-xs font-mono border border-rule bg-surface hover:border-ink text-ink rounded-[2px]"
            >
              −1 dot
            </button>
            <button
              type="button"
              onClick={() => setFlipDelta(0)}
              disabled={effectiveFlip === 0}
              className="px-2.5 py-1.5 text-xs font-mono border border-rule text-muted hover:text-ink disabled:opacity-40 rounded-[2px]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setFlipDelta(d => Math.min(maxFlips, d + 1))}
              className="px-3 py-1.5 text-xs font-mono border border-rule bg-surface hover:border-ink text-ink rounded-[2px]"
            >
              +1 dot
            </button>
          </div>

          <div className="pt-2 border-t border-rule/70 text-[11px] font-mono text-muted space-y-1">
            <div>1 patient = {onePatientPct.toFixed(2)} percentage points</div>
            <div>Mean spread (#1 SVM vs #3 RF) = {top3SpreadPp.toFixed(2)} pp</div>
          </div>
        </div>
      </div>
    </Figure>
  )
}
