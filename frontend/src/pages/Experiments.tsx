import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FlaskConical, ShieldAlert } from 'lucide-react'
import { Card, Badge } from '../components/Card'
import { useData } from '../useData'
import { fmtPct, fmtAUC, MODEL_LABELS } from '../utils'

interface VariantsData {
  variant_a_dnn_early_stopping: {
    title: string
    description: string
    hypothesis: string
    status: string
  }
  variant_b_median_imputation: {
    title: string
    description: string
    hypothesis: string
    status: string
    models: Record<string, Record<string, { mean: number; std: number }>>
  }
}

export default function Experiments() {
  const { data } = useData()
  const [variants, setVariants] = useState<VariantsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/variants.json`)
      .then((res) => {
        if (!res.ok) throw new Error('variants.json not available')
        return res.json()
      })
      .then((v) => {
        setVariants(v)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div style={{ padding: 32, color: 'var(--muted)' }}>Loading experimental variants...</div>
  }

  if (!variants) {
    return (
      <div style={{ maxWidth: 800, margin: '40px auto', padding: 24, textAlign: 'center' }}>
        <FlaskConical size={48} color="var(--muted)" style={{ marginBottom: 16 }} />
        <h3 style={{ fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>No Experimental Variants Generated</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          Run <code style={{ color: 'var(--teal)' }}>python improve_heart.py</code> to execute the bonus experimental variants (Early Stopping & Median Imputation).
        </p>
      </div>
    )
  }

  const varB = variants.variant_b_median_imputation
  const varA = variants.variant_a_dnn_early_stopping

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* Prominent Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <Badge variant="mine">Methodological Bonus</Badge>
          <Badge variant="warning">Supplementary Investigation</Badge>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
          Experimental Exploration: Model Improvement Variants
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, maxWidth: 880 }}>
          Independent exploratory experiments addressing data artifacts and deep learning instability identified during replication.
        </p>
      </motion.div>

      {/* Strict Separation Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 8,
          marginBottom: 28,
          fontSize: 13,
          color: 'var(--text)',
        }}
      >
        <ShieldAlert size={20} color="var(--amber)" style={{ flexShrink: 0 }} />
        <div>
          <b>Protocol Integrity Notice:</b> These variants are strictly supplementary and evaluated in <code style={{ color: 'var(--amber)' }}>results_variants/</code>. They do <b>NOT</b> alter or replace the paper-faithful replication numbers recorded in <code style={{ color: 'var(--teal)' }}>results_heart/</code>.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Variant B: Median Imputation */}
        <Card style={{ borderLeft: '4px solid var(--teal)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              {varB.title}
            </h3>
            <Badge variant="success">Executed (5 Seeds)</Badge>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>
            {varB.description}
          </p>

          <div style={{ background: 'var(--elevated)', padding: '12px 16px', borderRadius: 8, marginBottom: 18, fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}><b>Hypothesis:</b> </span>
            <span style={{ color: 'var(--text)' }}>{varB.hypothesis}</span>
          </div>

          {/* Comparison Table: Paper-Faithful vs Imputed Variant B */}
          {varB.models && data && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                Performance Comparison: Paper-Faithful Replication vs. Imputed Variant B
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 640 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--muted)' }}>Model</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--muted)' }}>Paper-Faithful Acc</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--teal)' }}>Variant B (Imputed) Acc</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--muted)' }}>Acc Change</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--muted)' }}>Paper-Faithful AUC</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--teal)' }}>Variant B (Imputed) AUC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['NB', 'DT', 'RF', 'SVM', 'LR'].map((m) => {
                      const faithfulAcc = (data.results[m]?.stats.accuracy?.mean ?? 0)
                      const faithfulAuc = (data.results[m]?.stats.auc?.mean ?? 0)
                      const vbAcc = varB.models[m]?.accuracy?.mean ?? 0
                      const vbAuc = varB.models[m]?.auc?.mean ?? 0
                      const diffAcc = vbAcc - faithfulAcc

                      return (
                        <tr key={m} style={{ borderBottom: '1px solid var(--border)', fontFamily: 'JetBrains Mono' }}>
                          <td style={{ padding: '9px 10px', fontWeight: 700, color: 'var(--text)', fontFamily: 'Inter' }}>
                            {m} ({MODEL_LABELS[m]})
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'center', color: '#F59E0B' }}>
                            {fmtPct(faithfulAcc)}
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'center', color: 'var(--teal)', fontWeight: 700 }}>
                            {fmtPct(vbAcc)}
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'center', color: diffAcc >= 0 ? '#34D399' : '#FB7185' }}>
                            {diffAcc >= 0 ? '+' : ''}{(diffAcc * 100).toFixed(2)} pp
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'center', color: '#F59E0B' }}>
                            {fmtAUC(faithfulAuc)}
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'center', color: 'var(--teal)', fontWeight: 700 }}>
                            {fmtAUC(vbAuc)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        {/* Variant A: DNN Early Stopping */}
        <Card style={{ borderLeft: '4px solid var(--amber)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              {varA.title}
            </h3>
            <Badge variant="warning">{varA.status}</Badge>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>
            {varA.description}
          </p>
          <div style={{ background: 'var(--elevated)', padding: '12px 16px', borderRadius: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}><b>Key Diagnostic Finding:</b> </span>
            <span style={{ color: 'var(--text)' }}>
              In the paper-faithful setup, DNN hyperparameters are selected purely by validation accuracy at the final epoch. For Seed 44, validation loss bottomed at epoch 3 (0.32) and rose to 1.56 by epoch 50. Implementing <code style={{ color: 'var(--teal)' }}>EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)</code> halts training at epoch 13, preserving generalized representations and preventing catastrophic overfitting.
            </span>
          </div>
        </Card>
      </div>
    </div>
  )
}
