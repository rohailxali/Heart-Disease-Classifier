import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, RefreshCw, CheckCircle2, XCircle,
  Server, Play, ShieldAlert, Sparkles, UserCheck
} from 'lucide-react'
import { Card, Badge } from '../components/Card'
import { MODEL_LABELS } from '../utils'

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
  input_features: Record<string, any>
  disclaimer: string
}

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
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Held-out test patient state
  const [heldOutPatient, setHeldOutPatient] = useState<{ trueLabel: number } | null>(null)

  // Check API health on mount
  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health')
      if (res.ok) {
        setApiOnline(true)
      } else {
        setApiOnline(false)
      }
    } catch {
      setApiOnline(false)
    }
  }

  useEffect(() => {
    let active = true
    fetch('/api/health')
      .then(res => { if (active) setApiOnline(res.ok) })
      .catch(() => { if (active) setApiOnline(false) })
    return () => { active = false }
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
      const res = await fetch('/api/samples?n=1')
      if (!res.ok) throw new Error('Failed to fetch test sample')
      const data = await res.json()
      if (data.samples && data.samples.length > 0) {
        const sample = data.samples[0]
        const { HeartDisease, ...features } = sample

        setForm(features)
        setHeldOutPatient({ trueLabel: HeartDisease })
        setCholZeroToggle(features.Cholesterol === 0)

        // Automatically predict for this sample
        await executePrediction(features)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not load test sample')
    } finally {
      setLoading(false)
    }
  }

  // Run prediction
  const executePrediction = async (inputData = form) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.detail || `Prediction failed (${res.status})`)
      }
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with prediction server')
    } finally {
      setLoading(false)
    }
  }

  // SVG Gauge Component
  const renderGauge = (probability: number) => {
    const color = probability > 0.5 ? '#FB7185' : '#2DD4BF'

    return (
      <div style={{ position: 'relative', width: 220, height: 125, margin: '0 auto' }}>
        <svg viewBox="0 0 200 115" width="100%" height="100%">
          {/* Background Track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--border)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Active Gradient Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray="251.2"
            strokeDashoffset={251.2 * (1 - probability)}
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.4s ease' }}
          />
          {/* Center Text */}
          <text x="100" y="88" textAnchor="middle" fill="var(--text)" fontSize="26" fontWeight="800" fontFamily="JetBrains Mono">
            {(probability * 100).toFixed(1)}%
          </text>
          <text x="100" y="106" textAnchor="middle" fill="var(--muted)" fontSize="11" fontWeight="600">
            ENSEMBLE RISK
          </text>
        </svg>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <Badge variant="info">Live Inference Engine</Badge>
          <Badge variant={apiOnline ? 'success' : 'warning'}>
            {apiOnline ? 'FastAPI Online' : 'API Standby'}
          </Badge>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
          Interactive Patient Risk Predictor
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, maxWidth: 880 }}>
          Live inference powered by pipelines trained on the seed-42 split. Test clinical attribute combinations or evaluate real held-out test patients with instant ground-truth verification.
        </p>
      </motion.div>

      {/* Permanent Medical Advice Disclaimer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 8,
          marginBottom: 24,
          fontSize: 13,
          color: 'var(--text)',
        }}
      >
        <ShieldAlert size={18} color="var(--amber)" style={{ flexShrink: 0 }} />
        <span>
          <b>Educational Demonstration Only:</b> This machine learning tool is an academic replication of Simanjuntak et al. (2025). It is not certified for clinical diagnosis and must never be used as a substitute for professional medical judgment.
        </span>
      </div>

      {/* API Offline Banner if offline */}
      {apiOnline === false && (
        <Card style={{ marginBottom: 28, border: '1px solid rgba(251,113,133,0.3)', background: 'var(--elevated)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <Server size={24} color="#FB7185" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                FastAPI Predictor Server is Offline
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>
                To enable live predictions and held-out test patient sampling, start the backend uvicorn service in your terminal:
              </p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <pre style={{ margin: 0, padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--teal)' }}>
                  npm run api
                </pre>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>or</span>
                <pre style={{ margin: 0, padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--teal)' }}>
                  python -m uvicorn api.main:app --reload --port 8000
                </pre>
                <button
                  onClick={checkHealth}
                  style={{
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'var(--teal)',
                    color: '#0A0F1C',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Check Connection Again
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Error Message banner if any */}
      {errorMsg && (
        <div style={{ padding: '10px 14px', background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.3)', borderRadius: 8, color: '#FB7185', fontSize: 13, marginBottom: 16 }}>
          {errorMsg}
        </div>
      )}

      {/* Main Grid: Form Inputs (Left) and Risk Gauge Results (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 24, marginBottom: 32 }}>
        {/* Left Column: Form Controls */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Patient Attributes
              </h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                Tune clinical measurements or sample a benchmark patient
              </p>
            </div>

            <button
              onClick={loadRandomPatient}
              disabled={loading || apiOnline === false}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: '1px solid var(--teal)',
                background: 'rgba(45,212,191,0.12)',
                color: 'var(--teal)',
                cursor: loading || apiOnline === false ? 'not-allowed' : 'pointer',
                opacity: apiOnline === false ? 0.5 : 1,
              }}
            >
              <Sparkles size={14} />
              Load Random Test Patient
            </button>
          </div>

          {/* Held-out Patient Notice if loaded */}
          {heldOutPatient && (
            <div style={{ padding: '10px 14px', background: 'var(--elevated)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 18, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                <UserCheck size={16} color="var(--teal)" />
                <span>Loaded patient from <b>Seed 42 Test Split (N=184)</b></span>
              </div>
              <Badge variant={heldOutPatient.trueLabel === 1 ? 'danger' : 'success'}>
                Actual: {heldOutPatient.trueLabel === 1 ? 'Disease' : 'Healthy'}
              </Badge>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Age */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <label style={{ fontWeight: 600, color: 'var(--text)' }}>Age</label>
                <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--teal)' }}>{form.Age} years</span>
              </div>
              <input
                type="range"
                min="28"
                max="77"
                value={form.Age}
                onChange={(e) => setForm({ ...form, Age: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--teal)' }}
              />
            </div>

            {/* Sex Segmented Control */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Sex
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { val: 'M', label: 'Male (M)' },
                  { val: 'F', label: 'Female (F)' },
                ].map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => setForm({ ...form, Sex: s.val })}
                    style={{
                      padding: '8px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: '1px solid',
                      borderColor: form.Sex === s.val ? 'var(--teal)' : 'var(--border)',
                      background: form.Sex === s.val ? 'rgba(45,212,191,0.15)' : 'var(--elevated)',
                      color: form.Sex === s.val ? 'var(--teal)' : 'var(--muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chest Pain Type */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Chest Pain Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { val: 'ASY', label: 'Asymptomatic (ASY)' },
                  { val: 'NAP', label: 'Non-Anginal (NAP)' },
                  { val: 'ATA', label: 'Atypical Angina (ATA)' },
                  { val: 'TA', label: 'Typical Angina (TA)' },
                ].map((cp) => (
                  <button
                    key={cp.val}
                    type="button"
                    onClick={() => setForm({ ...form, ChestPainType: cp.val })}
                    style={{
                      padding: '8px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: '1px solid',
                      borderColor: form.ChestPainType === cp.val ? 'var(--teal)' : 'var(--border)',
                      background: form.ChestPainType === cp.val ? 'rgba(45,212,191,0.15)' : 'var(--elevated)',
                      color: form.ChestPainType === cp.val ? 'var(--teal)' : 'var(--muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {cp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resting Blood Pressure */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <label style={{ fontWeight: 600, color: 'var(--text)' }}>Resting Blood Pressure</label>
                <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--teal)' }}>{form.RestingBP} mm Hg</span>
              </div>
              <input
                type="range"
                min="80"
                max="200"
                value={form.RestingBP}
                onChange={(e) => setForm({ ...form, RestingBP: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--teal)' }}
              />
            </div>

            {/* Cholesterol with Zero-Coded Switch */}
            <div style={{ background: 'var(--elevated)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Serum Cholesterol</label>
                <span style={{ fontFamily: 'JetBrains Mono', color: cholZeroToggle ? '#FB7185' : 'var(--teal)', fontWeight: 700 }}>
                  {form.Cholesterol} mg/dl
                </span>
              </div>

              {/* Zero-toggle switch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <input
                  type="checkbox"
                  id="zeroChol"
                  checked={cholZeroToggle}
                  onChange={(e) => handleCholToggle(e.target.checked)}
                  style={{ accentColor: '#FB7185', cursor: 'pointer' }}
                />
                <label htmlFor="zeroChol" style={{ fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
                  Not measured (dataset codes this as 0)
                </label>
              </div>

              {cholZeroToggle ? (
                <div style={{ fontSize: 11, color: '#FB7185', lineHeight: 1.4, padding: '6px 10px', background: 'rgba(251,113,133,0.1)', borderRadius: 6, border: '1px solid rgba(251,113,133,0.3)' }}>
                  ⚠ <b>Zero-missingness bias active:</b> The dataset has an 88.4% disease rate for patients with Cholesterol=0. Classifiers will treat this measurement as strong positive disease evidence.
                </div>
              ) : (
                <input
                  type="range"
                  min="100"
                  max="500"
                  value={form.Cholesterol}
                  onChange={(e) => setForm({ ...form, Cholesterol: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--teal)' }}
                />
              )}
            </div>

            {/* Fasting Blood Sugar */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Fasting Blood Sugar
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { val: 0, label: '≤ 120 mg/dl (Normal)' },
                  { val: 1, label: '> 120 mg/dl (Elevated)' },
                ].map((f) => (
                  <button
                    key={f.val}
                    type="button"
                    onClick={() => setForm({ ...form, FastingBS: f.val })}
                    style={{
                      padding: '8px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: '1px solid',
                      borderColor: form.FastingBS === f.val ? 'var(--teal)' : 'var(--border)',
                      background: form.FastingBS === f.val ? 'rgba(45,212,191,0.15)' : 'var(--elevated)',
                      color: form.FastingBS === f.val ? 'var(--teal)' : 'var(--muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resting ECG */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Resting Electrocardiogram (ECG)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { val: 'Normal', label: 'Normal' },
                  { val: 'ST', label: 'ST Abnormality' },
                  { val: 'LVH', label: 'LVH' },
                ].map((ecg) => (
                  <button
                    key={ecg.val}
                    type="button"
                    onClick={() => setForm({ ...form, RestingECG: ecg.val })}
                    style={{
                      padding: '8px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: '1px solid',
                      borderColor: form.RestingECG === ecg.val ? 'var(--teal)' : 'var(--border)',
                      background: form.RestingECG === ecg.val ? 'rgba(45,212,191,0.15)' : 'var(--elevated)',
                      color: form.RestingECG === ecg.val ? 'var(--teal)' : 'var(--muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {ecg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Heart Rate */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <label style={{ fontWeight: 600, color: 'var(--text)' }}>Maximum Heart Rate (MaxHR)</label>
                <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--teal)' }}>{form.MaxHR} bpm</span>
              </div>
              <input
                type="range"
                min="60"
                max="202"
                value={form.MaxHR}
                onChange={(e) => setForm({ ...form, MaxHR: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--teal)' }}
              />
            </div>

            {/* Exercise Angina */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Exercise-Induced Angina
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { val: 'N', label: 'No Angina (N)' },
                  { val: 'Y', label: 'Yes, Angina Present (Y)' },
                ].map((ea) => (
                  <button
                    key={ea.val}
                    type="button"
                    onClick={() => setForm({ ...form, ExerciseAngina: ea.val })}
                    style={{
                      padding: '8px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: '1px solid',
                      borderColor: form.ExerciseAngina === ea.val ? 'var(--teal)' : 'var(--border)',
                      background: form.ExerciseAngina === ea.val ? 'rgba(45,212,191,0.15)' : 'var(--elevated)',
                      color: form.ExerciseAngina === ea.val ? 'var(--teal)' : 'var(--muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {ea.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Oldpeak (ST Depression) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <label style={{ fontWeight: 600, color: 'var(--text)' }}>ST Depression (Oldpeak)</label>
                <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--teal)' }}>{form.Oldpeak.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min="-2.5"
                max="6.0"
                step="0.1"
                value={form.Oldpeak}
                onChange={(e) => setForm({ ...form, Oldpeak: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--teal)' }}
              />
            </div>

            {/* ST Slope */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                ST Slope
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { val: 'Up', label: 'Upsloping (Up)' },
                  { val: 'Flat', label: 'Flat' },
                  { val: 'Down', label: 'Downsloping' },
                ].map((sl) => (
                  <button
                    key={sl.val}
                    type="button"
                    onClick={() => setForm({ ...form, ST_Slope: sl.val })}
                    style={{
                      padding: '8px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: '1px solid',
                      borderColor: form.ST_Slope === sl.val ? 'var(--teal)' : 'var(--border)',
                      background: form.ST_Slope === sl.val ? 'rgba(45,212,191,0.15)' : 'var(--elevated)',
                      color: form.ST_Slope === sl.val ? 'var(--teal)' : 'var(--muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {sl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Predict Button */}
            <button
              onClick={() => executePrediction()}
              disabled={loading || apiOnline === false}
              style={{
                marginTop: 8,
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 8,
                border: 'none',
                background: 'var(--teal)',
                color: '#0A0F1C',
                cursor: loading || apiOnline === false ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(45,212,191,0.25)',
                opacity: apiOnline === false ? 0.5 : 1,
              }}
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
              Compute Ensemble Risk
            </button>
          </div>
        </Card>

        {/* Right Column: Prediction Output & Consensus */}
        <div>
          {result ? (
            <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
                  Risk Assessment Summary
                </h3>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                  Ensemble probability synthesized across seed-42 trained pipelines
                </p>
              </div>

              {/* Animated Risk Gauge */}
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                {renderGauge(result.ensemble.probability)}

                <div style={{ marginTop: 8 }}>
                  <Badge variant={result.ensemble.prediction === 1 ? 'danger' : 'success'}>
                    Predicted: {result.ensemble.label}
                  </Badge>
                </div>
              </div>

              {/* Agreement Meter */}
              <div style={{ background: 'var(--elevated)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Model Agreement Consensus</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono' }}>
                    {result.ensemble.agreement}
                  </span>
                </div>
                <div style={{ width: '100%', height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${result.ensemble.consensus_pct}%`,
                      height: '100%',
                      background: result.ensemble.prediction === 1 ? '#FB7185' : '#2DD4BF',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Ground Truth Comparison if test patient was loaded */}
              {heldOutPatient && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: heldOutPatient.trueLabel === result.ensemble.prediction
                      ? 'rgba(52,211,153,0.08)'
                      : 'rgba(251,113,133,0.08)',
                    border: `1px solid ${
                      heldOutPatient.trueLabel === result.ensemble.prediction
                        ? 'rgba(52,211,153,0.3)'
                        : 'rgba(251,113,133,0.3)'
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  {heldOutPatient.trueLabel === result.ensemble.prediction ? (
                    <CheckCircle2 size={20} color="#34D399" style={{ flexShrink: 0 }} />
                  ) : (
                    <XCircle size={20} color="#FB7185" style={{ flexShrink: 0 }} />
                  )}
                  <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                    <b>Ground Truth Verification:</b> The ensemble predicted{' '}
                    <b>{result.ensemble.prediction === 1 ? 'Disease' : 'Healthy'}</b>. The true label for this held-out test patient is{' '}
                    <b>{heldOutPatient.trueLabel === 1 ? 'Heart Disease' : 'Healthy'}</b> (
                    {heldOutPatient.trueLabel === result.ensemble.prediction ? 'Accurate Match ✓' : 'Discrepancy ✗'}).
                  </div>
                </div>
              )}

              {/* Per-Model Probability Breakdown Bars */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  Per-Model Breakdown
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(result.models).map(([mName, mData]) => {
                    if (!mData.available || mData.probability === null) {
                      return (
                        <div key={mName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '6px 10px', background: 'var(--elevated)', borderRadius: 6 }}>
                          <span style={{ fontWeight: 600, color: 'var(--muted)' }}>{mName}</span>
                          <span style={{ fontStyle: 'italic', color: 'var(--muted)', fontSize: 11 }}>Model unavailable</span>
                        </div>
                      )
                    }

                    const probPct = (mData.probability * 100).toFixed(1)
                    const isDis = mData.prediction === 1

                    return (
                      <div key={mName} style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '8px 10px', background: 'var(--elevated)', borderRadius: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{mName} ({MODEL_LABELS[mName] || mName})</span>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: isDis ? '#FB7185' : '#2DD4BF' }}>
                            {probPct}% ({mData.label})
                          </span>
                        </div>
                        <div style={{ width: '100%', height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${probPct}%`,
                              height: '100%',
                              background: isDis ? '#FB7185' : '#2DD4BF',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          ) : (
            <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
              <Activity size={48} color="var(--border)" style={{ marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                Awaiting Patient Parameters
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 320, lineHeight: 1.5, margin: 0 }}>
                Adjust the clinical features on the left, or click "Load Random Test Patient" to evaluate held-out benchmark cases against our trained ensemble.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
