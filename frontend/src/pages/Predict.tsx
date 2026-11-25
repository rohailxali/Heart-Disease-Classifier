import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, RefreshCw, Server, Play, ShieldAlert, UserCheck
} from 'lucide-react'
import { Card, Badge } from '../components/Card'
import { Button } from '../components/Button'
import { MODEL_LABELS } from '../utils'
import {
  checkApiHealth,
  fetchApiSamples,
  postPrediction,
  ApiHealthResponse
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

// Initial values set to dataset medians/modes (not a typical patient)
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Held-out test patient state
  const [heldOutPatient, setHeldOutPatient] = useState<{ trueLabel: number } | null>(null)

  const pollIntervalRef = useRef<number | null>(null)
  const pollTimerRef = useRef<number | null>(null)

  // Check health and manage waking polling
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
        setErrorMsg('Server wake-up timed out after 90 seconds. Please check backend status.')
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
        // Continue polling
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

  // Handle cholesterol zero toggle
  const handleCholToggle = (checked: boolean) => {
    setCholZeroToggle(checked)
    if (checked) {
      setPrevNonzeroChol(form.Cholesterol > 0 ? form.Cholesterol : 223)
      setForm((prev) => ({ ...prev, Cholesterol: 0 }))
    } else {
      setForm((prev) => ({ ...prev, Cholesterol: prevNonzeroChol > 0 ? prevNonzeroChol : 223 }))
    }
  }

  // Load random test patient from seed-42 test split
  const loadRandomPatient = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const data = await fetchApiSamples(1)
      if (data.samples && data.samples.length > 0) {
        const sample = data.samples[0]
        const { HeartDisease, ...features } = sample

        setForm(features)
        setHeldOutPatient({ trueLabel: HeartDisease })
        setCholZeroToggle(features.Cholesterol === 0)

        // Automatically predict for this sample
        await executePrediction(features)
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not load test sample')
    } finally {
      setLoading(false)
    }
  }

  // Run prediction
  const executePrediction = async (inputData = form) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const data = await postPrediction(inputData)
      setResult(data)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error communicating with prediction server')
    } finally {
      setLoading(false)
    }
  }

  // SVG Gauge Component
  const renderGauge = (probability: number) => {
    const color = probability > 0.5 ? '#FB7185' : '#2DD4BF'
    const angle = (probability * 180) - 90 // -90 to +90 degrees

    return (
      <div className="relative w-[220px] h-[125px] mx-auto">
        <svg viewBox="0 0 200 115" className="w-full h-full">
          {/* Background Track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--border)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Active Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray="251.32"
            strokeDashoffset={251.32 * (1 - probability)}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
          {/* Needle Center Pin */}
          <circle cx="100" cy="100" r="6" fill="var(--text)" />
          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="32"
            stroke="var(--text)"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${angle} 100 100)`}
            style={{ transition: 'transform 0.6s ease' }}
          />
        </svg>
        <div className="absolute bottom-1 inset-x-0 text-center font-mono font-extrabold text-2xl text-text">
          {(probability * 100).toFixed(1)}%
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1240px] mx-auto px-5 py-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <div className="flex gap-2 items-center mb-2 flex-wrap">
          <Badge variant="info">Live Diagnostic Predictor</Badge>
          <Badge variant="default">Seed 42 Models</Badge>
          {apiOnline === true ? (
            <Badge variant="success">
              {apiHealth?.dnn_available ? 'All 6 Models Live' : '5 of 6 models live; DNN is not served in this deployment'}
            </Badge>
          ) : (
            <Badge variant="danger">API Offline</Badge>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight mb-2">
          Interactive Patient Risk Predictor & Consensus
        </h1>
        <p className="text-sm text-muted max-w-3xl leading-relaxed">
          Test clinical patient inputs across all 6 models trained on the seed-42 split. Inspect individual model probabilities, ensemble voting consensus, and sensitivity to the zero-cholesterol artifact.
        </p>
      </motion.div>

      {/* Offline / Waking Banner if API is down */}
      {apiOnline === false && (
        <Card className="mb-6 border-amber/40 bg-amber-500/10 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Server size={22} className="text-amber flex-shrink-0" />
              <div>
                <div className="text-sm font-bold text-text">
                  {wakingUp ? `Waking predictor server... (${wakeElapsed}s / 90s)` : 'Predictor API is offline or sleeping'}
                </div>
                <div className="text-xs text-muted">
                  {wakingUp
                    ? 'Free hosting spins down when idle. Polling health endpoint...'
                    : 'Start the API with `npm run api` or click Wake Server to poll if hosted on a free tier.'}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={startHealthCheck}
              >
                <RefreshCw size={14} className="mr-1.5" />
                Quick Check
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={wakingUp}
                onClick={startWakingPoll}
              >
                {wakingUp ? (
                  <>
                    <RefreshCw size={14} className="animate-spin mr-1.5" />
                    Waking Server...
                  </>
                ) : (
                  'Wake Server'
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {errorMsg && (
        <div className="p-3.5 mb-6 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300">
          <b>Notice:</b> {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Left Column: Patient Form */}
        <div className="lg:col-span-7">
          <Card>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-text">Patient Clinical Features</h3>
                <p className="text-xs text-muted">
                  Initial values are dataset medians/modes, not a typical patient.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadRandomPatient}
                disabled={loading || apiOnline === false}
              >
                <UserCheck size={14} className="mr-1.5 text-teal" />
                Load Test Split Patient
              </Button>
            </div>

            {/* Held-out patient banner */}
            {heldOutPatient && (
              <div className="mb-5 p-3 rounded-xl bg-teal/10 border border-teal/30 text-xs flex items-center justify-between">
                <div>
                  <span className="text-muted">Loaded from seed-42 held-out test split. </span>
                  <span className="font-bold text-text">
                    Ground Truth: {heldOutPatient.trueLabel === 1 ? 'Heart Disease (1)' : 'Normal / Healthy (0)'}
                  </span>
                </div>
                <Badge variant={heldOutPatient.trueLabel === 1 ? 'danger' : 'success'}>
                  True Label: {heldOutPatient.trueLabel}
                </Badge>
              </div>
            )}

            {/* Form Inputs Grid */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                executePrediction()
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Age */}
                <div>
                  <label htmlFor="input-age" className="block text-xs font-semibold text-text mb-1">
                    Age (years): <span className="font-mono text-teal">{form.Age}</span>
                  </label>
                  <input
                    id="input-age"
                    type="range"
                    min="28"
                    max="77"
                    value={form.Age}
                    onChange={(e) => setForm({ ...form, Age: Number(e.target.value) })}
                    className="w-full accent-teal"
                  />
                  <div className="flex justify-between text-[10px] text-muted font-mono">
                    <span>28</span>
                    <span>77</span>
                  </div>
                </div>

                {/* Sex */}
                <div>
                  <label htmlFor="select-sex" className="block text-xs font-semibold text-text mb-1">
                    Sex
                  </label>
                  <select
                    id="select-sex"
                    value={form.Sex}
                    onChange={(e) => setForm({ ...form, Sex: e.target.value })}
                    className="w-full bg-elevated border border-border text-text rounded-lg p-2 text-xs focus-visible:ring-2 focus-visible:ring-teal"
                  >
                    <option value="M">Male (M)</option>
                    <option value="F">Female (F)</option>
                  </select>
                </div>

                {/* Chest Pain Type */}
                <div>
                  <label htmlFor="select-cpt" className="block text-xs font-semibold text-text mb-1">
                    Chest Pain Type
                  </label>
                  <select
                    id="select-cpt"
                    value={form.ChestPainType}
                    onChange={(e) => setForm({ ...form, ChestPainType: e.target.value })}
                    className="w-full bg-elevated border border-border text-text rounded-lg p-2 text-xs focus-visible:ring-2 focus-visible:ring-teal"
                  >
                    <option value="ASY">Asymptomatic (ASY)</option>
                    <option value="NAP">Non-Anginal Pain (NAP)</option>
                    <option value="ATA">Atypical Angina (ATA)</option>
                    <option value="TA">Typical Angina (TA)</option>
                  </select>
                </div>

                {/* Resting BP */}
                <div>
                  <label htmlFor="input-bp" className="block text-xs font-semibold text-text mb-1">
                    Resting BP (mm Hg): <span className="font-mono text-teal">{form.RestingBP}</span>
                  </label>
                  <input
                    id="input-bp"
                    type="range"
                    min="80"
                    max="200"
                    value={form.RestingBP}
                    onChange={(e) => setForm({ ...form, RestingBP: Number(e.target.value) })}
                    className="w-full accent-teal"
                  />
                  <div className="flex justify-between text-[10px] text-muted font-mono">
                    <span>80</span>
                    <span>200</span>
                  </div>
                </div>

                {/* Cholesterol with Zero-Toggle Shortcut */}
                <div className="sm:col-span-2 p-3 bg-elevated/70 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label htmlFor="input-chol" className="text-xs font-semibold text-text">
                      Serum Cholesterol (mg/dl): <span className="font-mono text-teal">{form.Cholesterol}</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-amber cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={cholZeroToggle}
                        onChange={(e) => handleCholToggle(e.target.checked)}
                        className="rounded accent-amber"
                      />
                      Force Cholesterol = 0 (Artifact Simulation)
                    </label>
                  </div>
                  <input
                    id="input-chol"
                    type="range"
                    min="0"
                    max="603"
                    disabled={cholZeroToggle}
                    value={form.Cholesterol}
                    onChange={(e) => setForm({ ...form, Cholesterol: Number(e.target.value) })}
                    className="w-full accent-teal disabled:opacity-40"
                  />
                  <div className="flex justify-between text-[10px] text-muted font-mono mt-0.5">
                    <span>0</span>
                    <span>603</span>
                  </div>
                </div>

                {/* Fasting Blood Sugar */}
                <div>
                  <label htmlFor="select-fbs" className="block text-xs font-semibold text-text mb-1">
                    Fasting Blood Sugar
                  </label>
                  <select
                    id="select-fbs"
                    value={form.FastingBS}
                    onChange={(e) => setForm({ ...form, FastingBS: Number(e.target.value) })}
                    className="w-full bg-elevated border border-border text-text rounded-lg p-2 text-xs focus-visible:ring-2 focus-visible:ring-teal"
                  >
                    <option value={0}>Normal (≤ 120 mg/dl)</option>
                    <option value={1}>Elevated (&gt; 120 mg/dl)</option>
                  </select>
                </div>

                {/* Resting ECG */}
                <div>
                  <label htmlFor="select-ecg" className="block text-xs font-semibold text-text mb-1">
                    Resting ECG
                  </label>
                  <select
                    id="select-ecg"
                    value={form.RestingECG}
                    onChange={(e) => setForm({ ...form, RestingECG: e.target.value })}
                    className="w-full bg-elevated border border-border text-text rounded-lg p-2 text-xs focus-visible:ring-2 focus-visible:ring-teal"
                  >
                    <option value="Normal">Normal</option>
                    <option value="ST">ST-T Wave Abnormality (ST)</option>
                    <option value="LVH">Left Ventricular Hypertrophy (LVH)</option>
                  </select>
                </div>

                {/* Max Heart Rate */}
                <div>
                  <label htmlFor="input-maxhr" className="block text-xs font-semibold text-text mb-1">
                    Max Heart Rate: <span className="font-mono text-teal">{form.MaxHR}</span>
                  </label>
                  <input
                    id="input-maxhr"
                    type="range"
                    min="60"
                    max="202"
                    value={form.MaxHR}
                    onChange={(e) => setForm({ ...form, MaxHR: Number(e.target.value) })}
                    className="w-full accent-teal"
                  />
                  <div className="flex justify-between text-[10px] text-muted font-mono">
                    <span>60</span>
                    <span>202</span>
                  </div>
                </div>

                {/* Exercise Induced Angina */}
                <div>
                  <label htmlFor="select-exang" className="block text-xs font-semibold text-text mb-1">
                    Exercise-Induced Angina
                  </label>
                  <select
                    id="select-exang"
                    value={form.ExerciseAngina}
                    onChange={(e) => setForm({ ...form, ExerciseAngina: e.target.value })}
                    className="w-full bg-elevated border border-border text-text rounded-lg p-2 text-xs focus-visible:ring-2 focus-visible:ring-teal"
                  >
                    <option value="N">No (N)</option>
                    <option value="Y">Yes (Y)</option>
                  </select>
                </div>

                {/* Oldpeak (ST Depression) */}
                <div>
                  <label htmlFor="input-oldpeak" className="block text-xs font-semibold text-text mb-1">
                    ST Depression (Oldpeak): <span className="font-mono text-teal">{form.Oldpeak}</span>
                  </label>
                  <input
                    id="input-oldpeak"
                    type="range"
                    min="-2.6"
                    max="6.2"
                    step="0.1"
                    value={form.Oldpeak}
                    onChange={(e) => setForm({ ...form, Oldpeak: Number(e.target.value) })}
                    className="w-full accent-teal"
                  />
                  <div className="flex justify-between text-[10px] text-muted font-mono">
                    <span>-2.6</span>
                    <span>6.2</span>
                  </div>
                </div>

                {/* ST Slope */}
                <div>
                  <label htmlFor="select-slope" className="block text-xs font-semibold text-text mb-1">
                    Peak Exercise ST Slope
                  </label>
                  <select
                    id="select-slope"
                    value={form.ST_Slope}
                    onChange={(e) => setForm({ ...form, ST_Slope: e.target.value })}
                    className="w-full bg-elevated border border-border text-text rounded-lg p-2 text-xs focus-visible:ring-2 focus-visible:ring-teal"
                  >
                    <option value="Up">Upsloping (Up)</option>
                    <option value="Flat">Flat</option>
                    <option value="Down">Downsloping (Down)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full"
                  disabled={loading || apiOnline === false}
                >
                  <Play size={16} className="fill-current" />
                  {loading ? 'Evaluating Models...' : 'Calculate Risk & Consensus'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Prediction Results */}
        <div className="lg:col-span-5 space-y-5">
          {result ? (
            <>
              {/* Ensemble Gauge Card */}
              <Card>
                <div className="text-center mb-3">
                  <Badge variant={result.ensemble.prediction === 1 ? 'danger' : 'success'}>
                    {result.ensemble.label}
                  </Badge>
                  <h3 className="text-lg font-bold text-text mt-2">
                    Ensemble Heart Disease Probability
                  </h3>
                  <p className="text-xs text-muted">
                    {result.ensemble.agreement} ({result.ensemble.consensus_pct}% consensus)
                  </p>
                </div>

                {renderGauge(result.ensemble.probability)}

                <div className="text-center text-xs text-muted mt-2">
                  Decision threshold: 50.0% probability
                </div>
              </Card>

              {/* Individual Model Breakdown */}
              <Card>
                <h4 className="text-sm font-bold text-text mb-3">Individual Model Breakdown</h4>
                <div className="space-y-2.5">
                  {['NB', 'DT', 'RF', 'SVM', 'LR', 'DNN'].map((m) => {
                    const modelRes = result.models[m]
                    if (!modelRes || !modelRes.available) {
                      return (
                        <div key={m} className="flex items-center justify-between p-2 rounded-lg bg-elevated/40 text-xs">
                          <span className="font-semibold text-muted">{m} ({MODEL_LABELS[m]})</span>
                          <span className="text-[11px] text-muted italic">Unavailable (Not loaded)</span>
                        </div>
                      )
                    }

                    const prob = modelRes.probability ?? 0
                    const isDisease = modelRes.prediction === 1

                    return (
                      <div key={m} className="p-2.5 rounded-xl bg-elevated/60 border border-border">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-text">{m} ({MODEL_LABELS[m]})</span>
                          <span className={`font-mono font-bold ${isDisease ? 'text-rose-400' : 'text-teal'}`}>
                            {(prob * 100).toFixed(1)}% ({modelRes.label})
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${isDisease ? 'bg-rose-500' : 'bg-teal'}`}
                            style={{ width: `${prob * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Medical Disclaimer */}
              <div className="p-3 bg-elevated/50 border border-border rounded-xl text-[11px] text-muted leading-relaxed flex items-start gap-2">
                <ShieldAlert size={16} className="text-amber flex-shrink-0 mt-0.5" />
                <span>{result.disclaimer}</span>
              </div>
            </>
          ) : (
            <Card className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-8">
              <Activity size={40} className="text-teal/40 mb-3" />
              <h4 className="text-base font-bold text-text mb-1">No Prediction Generated Yet</h4>
              <p className="text-xs text-muted max-w-xs leading-relaxed">
                Adjust clinical parameters on the left or click "Load Test Split Patient" to evaluate the models against held-out ground truth.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
