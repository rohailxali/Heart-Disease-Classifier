import React, { useState, useMemo, useRef, useEffect } from 'react'
import type { Eda } from '../../schemas'
import { Figure } from '../Figure'
import { SegmentedControl } from '../SegmentedControl'

interface PatientCohortVizProps {
  eda: Eda
}

type CohortStage = 'all' | 'diagnosis' | 'cholesterol'

interface CohortDot {
  id: number
  isDisease: boolean
  isZeroChol: boolean
}

export function PatientCohortViz({ eda }: PatientCohortVizProps) {
  const [stage, setStage] = useState<CohortStage>('all')
  const [manualLock, setManualLock] = useState(false)

  // Scroll sentinels so scrolling gently guides through the three views
  const refS2 = useRef<HTMLButtonElement>(null)
  const refS3 = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (manualLock || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            if (entry.target === refS3.current) {
              setStage('cholesterol')
            } else if (entry.target === refS2.current) {
              setStage(prev => (prev === 'all' ? 'diagnosis' : prev))
            }
          }
        }
      },
      { threshold: 0.7 }
    )
    if (refS2.current) observer.observe(refS2.current)
    if (refS3.current) observer.observe(refS3.current)
    return () => observer.disconnect()
  }, [manualLock])

  const counts = useMemo(
    () =>
      eda.data_quality.cholesterol_zero_x_disease ?? {
        zero_chol_disease: 152,
        zero_chol_healthy: 20,
        nonzero_chol_disease: 356,
        nonzero_chol_healthy: 390,
        total_zero_chol: 172,
        total_nonzero_chol: 746,
      },
    [eda.data_quality.cholesterol_zero_x_disease]
  )

  const total = eda.data_quality.total_rows // 918
  const nHealthy = eda.class_counts.healthy // 410
  const nDisease = eda.class_counts.disease // 508

  // Build stable deterministic array of 918 patient tokens strictly from exact counts
  const patients: CohortDot[] = useMemo(() => {
    const arr: CohortDot[] = []
    for (let i = 0; i < counts.zero_chol_healthy; i++) {
      arr.push({ id: arr.length, isDisease: false, isZeroChol: true })
    }
    for (let i = 0; i < counts.nonzero_chol_healthy; i++) {
      arr.push({ id: arr.length, isDisease: false, isZeroChol: false })
    }
    for (let i = 0; i < counts.zero_chol_disease; i++) {
      arr.push({ id: arr.length, isDisease: true, isZeroChol: true })
    }
    for (let i = 0; i < counts.nonzero_chol_disease; i++) {
      arr.push({ id: arr.length, isDisease: true, isZeroChol: false })
    }
    return arr
  }, [counts])

  // Compute exact (x, y) coordinates and semantic fill per stage
  const positioned = useMemo(() => {
    let idxZCH = 0
    let idxNZH = 0
    let idxZCD = 0
    let idxNZD = 0

    return patients.map((p, idx) => {
      // Stage 1: Unified 54 x 17 grid (918 exact)
      const colsAll = 54
      const xAll = 26 + (idx % colsAll) * 11.8
      const yAll = 62 + Math.floor(idx / colsAll) * 12.2

      // Stage 2: Split Healthy (left) vs Disease (right)
      let xDiag = xAll
      let yDiag = yAll
      if (!p.isDisease) {
        const localIdx = p.isZeroChol ? idxZCH : counts.zero_chol_healthy + idxNZH
        const colsH = 22
        xDiag = 28 + (localIdx % colsH) * 11.5
        yDiag = 62 + Math.floor(localIdx / colsH) * 11.5
      } else {
        const localIdx = p.isZeroChol ? idxZCD : counts.zero_chol_disease + idxNZD
        const colsD = 26
        xDiag = 352 + (localIdx % colsD) * 11.5
        yDiag = 62 + Math.floor(localIdx / colsD) * 11.5
      }

      // Stage 3: 2x2 Quadrant — Top row: Cholesterol == 0 (172), Bottom row: Cholesterol > 0 (746)
      let xChol = xAll
      let yChol = yAll
      if (p.isZeroChol && !p.isDisease) {
        const i = idxZCH++
        xChol = 52 + (i % 10) * 11.5
        yChol = 56 + Math.floor(i / 10) * 12
      } else if (p.isZeroChol && p.isDisease) {
        const i = idxZCD++
        xChol = 352 + (i % 26) * 11.2
        yChol = 56 + Math.floor(i / 26) * 12
      } else if (!p.isZeroChol && !p.isDisease) {
        const i = idxNZH++
        xChol = 28 + (i % 26) * 11.2
        yChol = 166 + Math.floor(i / 26) * 11.2
      } else {
        const i = idxNZD++
        xChol = 352 + (i % 26) * 11.2
        yChol = 166 + Math.floor(i / 26) * 11.2
      }

      let cx = xAll
      let cy = yAll
      let fill = 'var(--color-slate)'
      let opacity = 0.78

      if (stage === 'diagnosis') {
        cx = xDiag
        cy = yDiag
        fill = p.isDisease ? 'var(--color-oxblood)' : 'var(--color-green)'
        opacity = 0.88
      } else if (stage === 'cholesterol') {
        cx = xChol
        cy = yChol
        fill = p.isDisease ? 'var(--color-oxblood)' : 'var(--color-green)'
        opacity = p.isZeroChol ? 0.96 : 0.45
      }

      return { ...p, cx, cy, fill, opacity }
    })
  }, [patients, counts, stage])

  const selectStage = (s: CohortStage) => {
    setManualLock(true)
    setStage(s)
  }

  return (
    <Figure
      label="Figure 2.1 · Full Study Cohort (918 Dots)"
      title="One dot per patient — from whole cohort to the zero-cholesterol fault line"
      subtitle="Step through the three cohort breakdowns. Zero patient attributes are invented; every coordinate reflects exact table counts from eda.json."
      controls={
        <SegmentedControl
          size="sm"
          name="cohort-stage"
          ariaLabel="Cohort dot grouping"
          value={stage}
          onChange={(v) => selectStage(v as CohortStage)}
          options={[
            { value: 'all', label: `1. All (${total})` },
            { value: 'diagnosis', label: '2. Diagnosis' },
            { value: 'cholesterol', label: '3. Chol = 0' },
          ]}
        />
      }
      caption={
        stage === 'all'
          ? `${total} complete records with 0 missing cells and 0 exact duplicate rows.`
          : stage === 'diagnosis'
            ? `${nHealthy} healthy (${((nHealthy / total) * 100).toFixed(1)}%) vs ${nDisease} heart disease (${((nDisease / total) * 100).toFixed(1)}%).`
            : `${counts.zero_chol_disease} of ${counts.total_zero_chol} zero-cholesterol patients (${eda.data_quality.disease_rate_zero_cholesterol_pct}%) carry heart disease, versus ${eda.data_quality.disease_rate_nonzero_cholesterol_pct}% otherwise.`
      }
      source="Source: heart.csv via eda.json"
      fallback={{
        caption: 'Exact 2x2 cohort counts (Cholesterol == 0 vs HeartDisease)',
        headers: ['Cholesterol Status', 'Healthy (0)', 'Disease (1)', 'Total', 'Disease Rate'],
        rows: [
          ['Recorded as 0', counts.zero_chol_healthy, counts.zero_chol_disease, counts.total_zero_chol, `${eda.data_quality.disease_rate_zero_cholesterol_pct}%`],
          ['Measured (> 0)', counts.nonzero_chol_healthy, counts.nonzero_chol_disease, counts.total_nonzero_chol, `${eda.data_quality.disease_rate_nonzero_cholesterol_pct}%`],
          ['All Patients', nHealthy, nDisease, total, `${((nDisease / total) * 100).toFixed(1)}%`],
        ],
      }}
    >
      {/* Interactive Stage Narrative Pills (also act as gentle scroll checkpoints) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <button
          type="button"
          onClick={() => selectStage('all')}
          className={`text-left p-2.5 border transition-colors rounded-[2px] ${
            stage === 'all' ? 'border-ink bg-surface' : 'border-rule/70 hover:border-ink/40'
          }`}
        >
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">Stage 1 · Enrolled</div>
          <div className="text-xs font-medium text-ink mt-0.5">{total} patients across 5 hospital centers</div>
        </button>

        <button
          ref={refS2}
          type="button"
          onClick={() => selectStage('diagnosis')}
          className={`text-left p-2.5 border transition-colors rounded-[2px] ${
            stage === 'diagnosis' ? 'border-ink bg-surface' : 'border-rule/70 hover:border-ink/40'
          }`}
        >
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">Stage 2 · Label Split</div>
          <div className="text-xs font-medium text-ink mt-0.5">{nHealthy} healthy · {nDisease} disease</div>
        </button>

        <button
          ref={refS3}
          type="button"
          onClick={() => selectStage('cholesterol')}
          className={`text-left p-2.5 border transition-colors rounded-[2px] ${
            stage === 'cholesterol' ? 'border-ochre bg-surface' : 'border-rule/70 hover:border-ink/40'
          }`}
        >
          <div className="font-mono text-[10px] uppercase tracking-wider text-ochreInk">Stage 3 · Artifact</div>
          <div className="text-xs font-medium text-ink mt-0.5">
            {counts.total_zero_chol} chol=0 ({eda.data_quality.disease_rate_zero_cholesterol_pct}% disease)
          </div>
        </button>
      </div>

      <svg
        viewBox="0 0 680 352"
        role="img"
        aria-label={`Dot matrix of ${total} patients grouped by ${stage}`}
        className="w-full h-auto"
      >
        {/* Stage headings inside SVG */}
        {stage === 'all' && (
          <text x="26" y="42" className="font-mono text-xs font-medium fill-ink">
            ALL PATIENTS · n = {total} ({eda.data_quality.missing_values} NaNs, {eda.data_quality.duplicates} duplicates)
          </text>
        )}

        {stage === 'diagnosis' && (
          <>
            <line x1="336" x2="336" y1="24" y2="334" stroke="var(--color-rule)" strokeWidth="1" />
            <text x="28" y="42" className="font-mono text-xs font-semibold fill-green">
              HEALTHY · {nHealthy} ({((nHealthy / total) * 100).toFixed(1)}%)
            </text>
            <text x="352" y="42" className="font-mono text-xs font-semibold fill-oxblood">
              HEART DISEASE · {nDisease} ({((nDisease / total) * 100).toFixed(1)}%)
            </text>
          </>
        )}

        {stage === 'cholesterol' && (
          <>
            {/* Top band highlight for Cholesterol == 0 artifact */}
            <rect
              x="16"
              y="18"
              width="648"
              height="120"
              fill="var(--color-ochre)"
              fillOpacity="0.07"
              stroke="var(--color-ochre)"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <line x1="336" x2="336" y1="18" y2="342" stroke="var(--color-rule)" strokeWidth="1" />
            <text x="28" y="38" className="font-mono text-[11px] font-semibold fill-ochreInk">
              CHOLESTEROL = 0 · HEALTHY ({counts.zero_chol_healthy})
            </text>
            <text x="352" y="38" className="font-mono text-[11px] font-semibold fill-oxblood">
              CHOLESTEROL = 0 · DISEASE ({counts.zero_chol_disease} / {counts.total_zero_chol} = {eda.data_quality.disease_rate_zero_cholesterol_pct}%)
            </text>

            <text x="28" y="152" className="font-mono text-[11px] font-medium fill-green">
              MEASURED CHOL (&gt;0) · HEALTHY ({counts.nonzero_chol_healthy})
            </text>
            <text x="352" y="152" className="font-mono text-[11px] font-medium fill-muted">
              MEASURED CHOL (&gt;0) · DISEASE ({counts.nonzero_chol_disease} / {counts.total_nonzero_chol} = {eda.data_quality.disease_rate_nonzero_cholesterol_pct}%)
            </text>
          </>
        )}

        {/* All 918 patient circles */}
        {positioned.map(p => (
          <circle
            key={p.id}
            cx={0}
            cy={0}
            r={3.2}
            fill={p.fill}
            fillOpacity={p.opacity}
            className="patient-dot"
            style={{ transform: `translate(${p.cx}px, ${p.cy}px)` }}
          />
        ))}
      </svg>
    </Figure>
  )
}
