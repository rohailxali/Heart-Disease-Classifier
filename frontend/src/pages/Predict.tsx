import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { scaleLinear } from 'd3-scale'
import { RefreshCw, ArrowLeft, UserCheck, Play } from 'lucide-react'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { SegmentedControl } from '../components/SegmentedControl'
import { MODELS, MODEL_LABELS } from '../utils'
import {
  checkApiHealth,
  fetchApiSamples,
  postPrediction,
  type ApiHealthResponse,
} from '../api'

interface PredictionResult {
  ensemble: {
    probability: number
    prediction: number
    label: string
    agreement: string
    disease_votes: number
    total_models: number
    consensus_pct: number
  }
  models: Record<string, {
    probability: number | null
    prediction: number | null
    label: string
    available: boolean
  }>
  input_features: Record<string, unknown>
  disclaimer: string
}

// Initial values match dataset medians/modes
const DEFAULT_PATIENT = {
  Age: 54,
  Sex: 'M',
  ChestPainType: 'ASY',
  RestingBP: 130,
  Cholesterol: 223,
  FastingBS: 0,
  RestingECG: 'Normal',
  MaxHR: 138,
  ExerciseAngina: 'N',
  Oldpeak: 0.0,
  ST_Slope: 'Flat',
}

interface CaliperFieldProps {
  id: string
  label: string
  unit: string
  value: number
  min: number
  max: number
  step?: number
  disabled?: boolean
  onChange: (v: number) => void
}

function CaliperField({
  id,
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  disabled = false,
  onChange,
}: CaliperFieldProps) {
  const mid = Number(((min + max) / 2).toFixed(step < 1 ? 1 : 0))
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-ink">
          {label}
        </label>
        <span className="font-mono text-sm font-semibold text-ink">
          {step < 1 ? value.toFixed(1) : value}{' '}
          <span className="text-[11px] font-normal text-muted">{unit}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between font-mono text-[10px] text-muted border-t border-rule/60 pt-1">
        <span>| {min}</span>
        <span>| {mid}</span>
        <span>{max} |</span>
      </div>
    </div>
  )
}

export default function Predict() {
  const [form, setForm] = useState(DEFAULT_PATIENT)
  const [cholZeroToggle, setCholZeroToggle] = useState(false)
  const [prevNonzeroChol, setPrevNonzeroChol] = useState(223)

  const [loading, setLoading] = useState(false)
  const [apiHealth, setApiHealth] = useState<ApiHealthResponse | null>(null)
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const [wakingUp, setWakingUp] = useState(false)
  const [wakeElapsed, setWakeElapsed] = useState(0)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [ghostResult, setGhostResult] = useState<PredictionResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [heldOutPatient, setHeldOutPatient] = useState<{ trueLabel: number } | null>(null)

  const pollIntervalRef = useRef<number | null>(null)
  const pollTimerRef = useRef<number | null>(null)

  const startHealthCheck = async () => {
    try {
      const health = await checkApiHealth()
      setApiHealth(health)
      setApiOnline(true)
      setWakingUp(false)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    } catch {
      setApiOnline(false)
    }
  }

  const startWakingPoll = () => {
    setWakingUp(true)
    setWakeElapsed(0)
    setErrorMsg(null)

    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

    const startTime = Date.now()
    pollTimerRef.current = window.setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000)
      setWakeElapsed(elapsed)
      if (elapsed >= 90) {
        clearInterval(pollTimerRef.current!)
        clearInterval(pollIntervalRef.current!)
        setWakingUp(false)
        setErrorMsg('Predictor wake-up timed out after 90 seconds. Start local uvicorn or retry.')
      }
    }, 1000)

    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const health = await checkApiHealth()
        if (health.status === 'healthy') {
          setApiHealth(health)
          setApiOnline(true)
          setWakingUp(false)
          clearInterval(pollTimerRef.current!)
          clearInterval(pollIntervalRef.current!)
        }
      } catch {
        // Keep polling until ready or timeout
      }
    }, 3000)
  }

  useEffect(() => {
    let isMounted = true
    checkApiHealth()
      .then(health => {
        if (isMounted) {
          setApiHealth(health)
          setApiOnline(true)
        }
      })
      .catch(() => {
        if (isMounted) setApiOnline(false)
      })
    return () => {
      isMounted = false
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [])

  const handleCholToggle = (checked: boolean) => {
    setCholZeroToggle(checked)
    if (checked) {
      setPrevNonzeroChol(form.Cholesterol > 0 ? form.Cholesterol : 223)
      setForm(prev => ({ ...prev, Cholesterol: 0 }))
    } else {
      setForm(prev => ({ ...prev, Cholesterol: prevNonzeroChol > 0 ? prevNonzeroChol : 223 }))
    }
  }

  const executePrediction = async (inputData = form) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      if (inputData.Cholesterol !== 0) {
        // Dual call: real value vs synthetic Cholesterol=0 ghost artifact
        const [actual, ghost] = await Promise.all([
          postPrediction(inputData),
          postPrediction({ ...inputData, Cholesterol: 0 }),
        ])
        setResult(actual)
        setGhostResult(ghost)
      } else {
        const actual = await postPrediction(inputData)
        setResult(actual)
        setGhostResult(null)
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach prediction endpoint')
    } finally {
      setLoading(false)
    }
  }

  const loadRandomPatient = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const data = await fetchApiSamples(1)
      if (data.samples && data.samples.length > 0) {
        const { HeartDisease, ...features } = data.samples[0]
        setForm(features)
        setHeldOutPatient({ trueLabel: HeartDisease })
        setCholZeroToggle(features.Cholesterol === 0)
        await executePrediction(features)
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not fetch test-split patient')
    } finally {
      setLoading(false)
    }
  }

  // Horizontal probability dot plot geometry
  const W = 540
  const H = 278
  const margin = { top: 24, right: 36, bottom: 48, left: 82 }
  const innerW = W - margin.left - margin.right
  const innerH = H - margin.top - margin.bottom
  const xScale = scaleLinear().domain([0, 1]).range([0, innerW])
  const rowStep = innerH / 7 // Row 0 = Ensemble Mean, Rows 1..6 = NB..DNN

  return (
    <div className="min-h-[calc(100vh-4rem)] ecg-grid-paper py-10 sm:py-14">
      <div className="notebook-wide">
        {/* Sheet Header */}
        <header className="bg-surface/95 border-t-2 border-b border-ink px-5 sm:px-8 py-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft size={14} />
                Return to Notebook
              </Button>
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              <Chip variant="neutral">Consultation Sheet · Seed 42</Chip>
              {apiOnline === true ? (
                <Chip variant="healthy" dot>
                  {apiHealth?.dnn_available
                    ? 'All 6 models live'
                    : '5 of 6 models live (DNN unserved)'}
                </Chip>
              ) : (
                <Chip variant="disease" dot>
                  {wakingUp ? `Waking server (${wakeElapsed}s)` : 'Predictor Offline'}
                </Chip>
              )}
            </div>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">
            Patient Consultation &amp; Zero-Artifact Probe
          </h1>
          <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
            Inspect how five Seed-42 classifiers score a patient record along a calibrated 0–1 axis—and watch faint hollow ghost circles reveal where every model jumps if Serum Cholesterol were sent as 0 mg/dl.
          </p>
        </header>

        {/* Quiet offline / waking state bar */}
        {apiOnline === false && (
          <div className="bg-surface border-t border-b border-ochre px-5 py-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs leading-relaxed">
              <div className="font-mono font-semibold text-ink">
                {wakingUp
                  ? `Waiting for predictor API to wake up (${wakeElapsed}s / 90s)…`
                  : 'Live predictor service is offline or sleeping'}
              </div>
              <div className="text-muted mt-0.5">
                {wakingUp
                  ? 'Polling /api/health every 3 seconds; free-tier containers spin up within ~30s.'
                  : 'Start locally with `python api/train_models.py --skip-dnn` followed by `npm run api`, or wake a cold remote container.'}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="secondary" size="sm" onClick={startHealthCheck}>
                <RefreshCw size={13} />
                Check Status
              </Button>
              <Button variant="ochre" size="sm" disabled={wakingUp} onClick={startWakingPoll}>
                {wakingUp ? 'Polling…' : 'Wake Server'}
              </Button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="border-t border-b border-oxblood bg-surface px-4 py-3 mb-6 text-xs font-mono text-oxblood">
            Notice: {errorMsg}
          </div>
        )}

        {/* Two-column Clinical Intake Sheet & Readout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Clinical Parameters Intake */}
          <form
            onSubmit={e => {
              e.preventDefault()
              executePrediction()
            }}
            className="lg:col-span-6 bg-surface/95 border-t-2 border-b border-rule px-5 sm:px-7 py-6 space-y-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-rule">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Section A</div>
                <h2 className="font-display text-xl font-semibold text-ink">Patient Chart Inputs</h2>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={loadRandomPatient}
                disabled={loading || apiOnline === false}
              >
                <UserCheck size={14} />
                <span>Load Test-Split Patient</span>
              </Button>
            </div>

            {heldOutPatient && (
              <div className="border-l-2 border-slate pl-3 py-1 flex items-center justify-between text-xs font-mono">
                <span className="text-muted">Seed-42 held-out sample loaded</span>
                <Chip variant={heldOutPatient.trueLabel === 1 ? 'disease' : 'healthy'} dot>
                  True label: {heldOutPatient.trueLabel === 1 ? 'Disease (1)' : 'Healthy (0)'}
                </Chip>
              </div>
            )}

            {/* Caliper Numeric Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <CaliperField
                id="input-age"
                label="Age"
                unit="yrs"
                value={form.Age}
                min={28}
                max={77}
                onChange={v => setForm(prev => ({ ...prev, Age: v }))}
              />
              <CaliperField
                id="input-bp"
                label="Resting Blood Pressure"
                unit="mm Hg"
                value={form.RestingBP}
                min={80}
                max={200}
                onChange={v => setForm(prev => ({ ...prev, RestingBP: v }))}
              />
              <CaliperField
                id="input-maxhr"
                label="Max Heart Rate Achieved"
                unit="bpm"
                value={form.MaxHR}
                min={60}
                max={202}
                onChange={v => setForm(prev => ({ ...prev, MaxHR: v }))}
              />
              <CaliperField
                id="input-oldpeak"
                label="ST Depression (Oldpeak)"
                unit="mm"
                value={form.Oldpeak}
                min={-2.6}
                max={6.2}
                step={0.1}
                onChange={v => setForm(prev => ({ ...prev, Oldpeak: v }))}
              />
            </div>

            {/* Cholesterol Caliper with Explicit 0-Artifact Override */}
            <div className="border-t border-b border-rule/80 py-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-ochreInk">
                  Artifact Sensitivity Probe
                </span>
                <label className="inline-flex items-center gap-2 text-xs font-mono text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cholZeroToggle}
                    onChange={e => handleCholToggle(e.target.checked)}
                    className="accent-ink"
                  />
                  <span>Force Cholesterol = 0</span>
                </label>
              </div>
              <CaliperField
                id="input-chol"
                label="Serum Cholesterol"
                unit="mg/dl"
                value={form.Cholesterol}
                min={0}
                max={603}
                disabled={cholZeroToggle}
                onChange={v => setForm(prev => ({ ...prev, Cholesterol: v }))}
              />
            </div>

            {/* Stamp Segmented Controls */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-ink mb-1.5">Sex</div>
                  <SegmentedControl
                    size="sm"
                    name="pred-sex"
                    ariaLabel="Patient sex"
                    value={form.Sex}
                    onChange={v => setForm(prev => ({ ...prev, Sex: String(v) }))}
                    options={[
                      { value: 'M', label: 'Male' },
                      { value: 'F', label: 'Female' },
                    ]}
                  />
                </div>

                <div>
                  <div className="text-xs font-medium text-ink mb-1.5">Exercise Angina</div>
                  <SegmentedControl
                    size="sm"
                    name="pred-angina"
                    ariaLabel="Exercise induced angina"
                    value={form.ExerciseAngina}
                    onChange={v => setForm(prev => ({ ...prev, ExerciseAngina: String(v) }))}
                    options={[
                      { value: 'N', label: 'No (N)' },
                      { value: 'Y', label: 'Yes (Y)' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-ink mb-1.5">Chest Pain Type</div>
                <SegmentedControl
                  size="sm"
                  name="pred-cpt"
                  ariaLabel="Chest pain classification"
                  value={form.ChestPainType}
                  onChange={v => setForm(prev => ({ ...prev, ChestPainType: String(v) }))}
                  options={[
                    { value: 'ASY', label: 'ASY' },
                    { value: 'NAP', label: 'NAP' },
                    { value: 'ATA', label: 'ATA' },
                    { value: 'TA', label: 'TA' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-ink mb-1.5">Fasting Blood Sugar</div>
                  <SegmentedControl
                    size="sm"
                    name="pred-fbs"
                    ariaLabel="Fasting blood sugar"
                    value={form.FastingBS}
                    onChange={v => setForm(prev => ({ ...prev, FastingBS: Number(v) }))}
                    options={[
                      { value: 0, label: '≤ 120 mg/dl' },
                      { value: 1, label: '> 120 mg/dl' },
                    ]}
                  />
                </div>

                <div>
                  <div className="text-xs font-medium text-ink mb-1.5">Peak Exercise ST Slope</div>
                  <SegmentedControl
                    size="sm"
                    name="pred-slope"
                    ariaLabel="ST slope"
                    value={form.ST_Slope}
                    onChange={v => setForm(prev => ({ ...prev, ST_Slope: String(v) }))}
                    options={[
                      { value: 'Up', label: 'Up' },
                      { value: 'Flat', label: 'Flat' },
                      { value: 'Down', label: 'Down' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-ink mb-1.5">Resting ECG</div>
                <SegmentedControl
                  size="sm"
                  name="pred-ecg"
                  ariaLabel="Resting ECG"
                  value={form.RestingECG}
                  onChange={v => setForm(prev => ({ ...prev, RestingECG: String(v) }))}
                  options={[
                    { value: 'Normal', label: 'Normal' },
                    { value: 'ST', label: 'ST-T Abnorm.' },
                    { value: 'LVH', label: 'LVH' },
                  ]}
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={loading || apiOnline === false}
              >
                <Play size={14} />
                <span>{loading ? 'Evaluating Models…' : 'Calculate Risk & Consensus'}</span>
              </Button>
            </div>
          </form>

          {/* Right: Sober 0–1 Probability Dot Line + Ghost Shift Readout */}
          <div className="lg:col-span-6 bg-surface/95 border-t-2 border-b border-rule px-5 sm:px-7 py-6 space-y-6">
            <div className="pb-3 border-b border-rule flex items-baseline justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Section B</div>
                <h2 className="font-display text-xl font-semibold text-ink">Model Probability Strip</h2>
              </div>
              {result && (
                <Chip variant={result.ensemble.prediction === 1 ? 'disease' : 'healthy'} dot>
                  {result.ensemble.disease_votes} of {result.ensemble.total_models} models predict Disease
                </Chip>
              )}
            </div>

            {result ? (
              <>
                {/* Summary Headline Numerals */}
                <div className="grid grid-cols-2 gap-4 border-b border-rule/70 pb-4">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-wider text-muted">
                      Ensemble Mean Probability
                    </div>
                    <div
                      className={`numeral text-4xl mt-1 ${
                        result.ensemble.prediction === 1 ? 'text-oxblood' : 'text-green'
                      }`}
                    >
                      {(result.ensemble.probability * 100).toFixed(1)}%
                    </div>
                    <div className="font-mono text-xs text-muted mt-1">
                      {result.ensemble.label}
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-wider text-muted">
                      If Cholesterol Were 0
                    </div>
                    {ghostResult ? (
                      <>
                        <div className="numeral text-4xl text-ochreInk mt-1">
                          {(ghostResult.ensemble.probability * 100).toFixed(1)}%
                        </div>
                        <div className="font-mono text-xs text-muted mt-1">
                          Shift: {(ghostResult.ensemble.probability - result.ensemble.probability) >= 0 ? '+' : ''}
                          {((ghostResult.ensemble.probability - result.ensemble.probability) * 100).toFixed(1)} pp
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-mono text-sm text-ink mt-2">Already 0 mg/dl</div>
                        <div className="text-xs text-muted mt-1">Uncheck “Force Cholesterol = 0” to compare measured input.</div>
                      </>
                    )}
                  </div>
                </div>

                {/* SVG 0–1 Line Dot Plot with Ghost Displacement Arrows */}
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  role="img"
                  aria-label="Horizontal 0 to 1 probability plot per model with Cholesterol zero ghost markers"
                  className="w-full h-auto overflow-visible"
                >
                  <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {/* Ticks 0.0 to 1.0 */}
                    {[0, 0.25, 0.5, 0.75, 1].map(t => (
                      <g key={t} transform={`translate(${xScale(t)}, 0)`}>
                        <line
                          y1={0}
                          y2={innerH}
                          stroke={t === 0.5 ? 'var(--color-ink)' : 'var(--color-rule)'}
                          strokeWidth={t === 0.5 ? 1.2 : 0.7}
                          strokeDasharray={t === 0.5 ? '3 3' : '2 3'}
                          strokeOpacity={t === 0.5 ? 0.55 : 1}
                        />
                        <text y={innerH + 18} textAnchor="middle" className="font-mono text-[10px] fill-muted">
                          {(t * 100).toFixed(0)}%
                        </text>
                      </g>
                    ))}
                    <text
                      x={xScale(0.5)}
                      y={-8}
                      textAnchor="middle"
                      className="font-mono text-[10px] fill-muted"
                    >
                      50% threshold
                    </text>

                    {/* Row 0: Ensemble Mean */}
                    {(() => {
                      const y = rowStep * 0.5
                      const xAct = xScale(result.ensemble.probability)
                      const xGh = ghostResult ? xScale(ghostResult.ensemble.probability) : null
                      const color = result.ensemble.prediction === 1 ? 'var(--color-oxblood)' : 'var(--color-green)'
                      return (
                        <g transform={`translate(0, ${y})`}>
                          <line x1={0} x2={innerW} stroke="var(--color-rule)" strokeWidth="1" />
                          <text x={-10} y={4} textAnchor="end" className="font-mono text-[11px] font-bold fill-ink">
                            MEAN
                          </text>
                          {xGh !== null && (
                            <>
                              <line
                                x1={xAct}
                                x2={xGh}
                                stroke="var(--color-ochre)"
                                strokeWidth="1.4"
                                strokeDasharray="3 2"
                              />
                              <circle
                                cx={xGh}
                                cy={0}
                                r={5}
                                fill="var(--color-surface)"
                                stroke="var(--color-ochre)"
                                strokeWidth="1.6"
                                strokeDasharray="2 1.5"
                              />
                            </>
                          )}
                          <polygon
                            points={`${xAct},-7 ${xAct + 7},0 ${xAct},7 ${xAct - 7},0`}
                            fill={color}
                          />
                        </g>
                      )
                    })()}

                    {/* Rows 1..6: Individual Models */}
                    {MODELS.map((m, idx) => {
                      const y = rowStep * (idx + 1.5)
                      const mRes = result.models[m]
                      const mGhost = ghostResult?.models[m]

                      if (!mRes || !mRes.available || mRes.probability === null) {
                        return (
                          <g key={m} transform={`translate(0, ${y})`}>
                            <line x1={0} x2={innerW} stroke="var(--color-rule)" strokeWidth="0.5" strokeOpacity="0.6" />
                            <text x={-10} y={4} textAnchor="end" className="font-mono text-[11px] fill-muted">
                              {m}
                            </text>
                            <text x={8} y={4} className="font-mono text-[10px] fill-muted italic">
                              not served (TF absent)
                            </text>
                          </g>
                        )
                      }

                      const prob = mRes.probability
                      const xAct = xScale(prob)
                      const xGh = mGhost && mGhost.probability !== null ? xScale(mGhost.probability) : null
                      const color = prob >= 0.5 ? 'var(--color-oxblood)' : 'var(--color-green)'

                      return (
                        <g key={m} transform={`translate(0, ${y})`}>
                          <line x1={0} x2={innerW} stroke="var(--color-rule)" strokeWidth="0.5" />
                          <text x={-10} y={4} textAnchor="end" className="font-mono text-[11px] font-medium fill-ink">
                            {m}
                          </text>
                          {xGh !== null && (
                            <>
                              <line
                                x1={xAct}
                                x2={xGh}
                                stroke="var(--color-ochre)"
                                strokeWidth="1.2"
                                strokeDasharray="2 2"
                              />
                              <circle
                                cx={xGh}
                                cy={0}
                                r={4.5}
                                fill="var(--color-surface)"
                                stroke="var(--color-ochre)"
                                strokeWidth="1.5"
                                strokeDasharray="2 1.5"
                              >
                                <title>{m} if Chol=0: {((mGhost!.probability ?? 0) * 100).toFixed(1)}%</title>
                              </circle>
                            </>
                          )}
                          <circle cx={xAct} cy={0} r={5.2} fill={color} stroke="var(--color-surface)" strokeWidth="1">
                            <title>{MODEL_LABELS[m]}: {(prob * 100).toFixed(1)}%</title>
                          </circle>
                        </g>
                      )
                    })}

                    <text
                      x={innerW / 2}
                      y={innerH + 40}
                      textAnchor="middle"
                      className="font-mono text-[10px] uppercase tracking-wider fill-muted"
                    >
                      Predicted Heart Disease Probability (0.0 – 1.0)
                    </text>
                  </g>
                </svg>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-oxblood inline-block" /> Predict Disease (≥50%)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green inline-block" /> Predict Healthy (&lt;50%)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border border-dashed border-ochre bg-surface inline-block" /> Ghost (Chol=0)
                  </span>
                </div>

                {/* Dense Numeric Readout Table */}
                <div className="w-full overflow-x-auto border-t border-b border-rule">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <caption className="sr-only">Per-model probability breakdown and Cholesterol zero comparison</caption>
                    <thead>
                      <tr className="border-b border-rule text-[10px] uppercase text-muted">
                        <th scope="col" className="py-2 px-2">Model</th>
                        <th scope="col" className="py-2 px-2 text-right">Actual</th>
                        <th scope="col" className="py-2 px-2 text-right">If Chol=0</th>
                        <th scope="col" className="py-2 px-2 text-right">Shift</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule/40">
                      {MODELS.map(m => {
                        const mr = result.models[m]
                        const gr = ghostResult?.models[m]
                        if (!mr || !mr.available || mr.probability === null) {
                          return (
                            <tr key={m} className="text-muted">
                              <td className="py-1.5 px-2">{m}</td>
                              <td colSpan={3} className="py-1.5 px-2 text-right italic">Unavailable</td>
                            </tr>
                          )
                        }
                        const delta = gr && gr.probability !== null ? (gr.probability - mr.probability) * 100 : null
                        return (
                          <tr key={m}>
                            <td className="py-1.5 px-2 text-ink font-medium">{m}</td>
                            <td className={`py-1.5 px-2 text-right font-semibold ${mr.prediction === 1 ? 'text-oxblood' : 'text-green'}`}>
                              {(mr.probability * 100).toFixed(1)}%
                            </td>
                            <td className="py-1.5 px-2 text-right text-muted">
                              {gr && gr.probability !== null ? `${(gr.probability * 100).toFixed(1)}%` : '—'}
                            </td>
                            <td className="py-1.5 px-2 text-right text-ochreInk">
                              {delta !== null ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pp` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Research Disclaimer */}
                <p className="text-[11px] text-muted leading-relaxed border-t border-rule pt-3">
                  {result.disclaimer}
                </p>
              </>
            ) : (
              <div className="py-16 text-center space-y-2 border-t border-b border-rule/60">
                <div className="font-display text-lg font-semibold text-ink">
                  Awaiting patient parameters
                </div>
                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  Adjust clinical calipers or load a held-out Seed-42 patient on the left, then submit to compare model probabilities and zero-cholesterol sensitivity.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
