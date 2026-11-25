import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FlaskConical, ShieldAlert, Info } from 'lucide-react'
import { Card, Badge } from '../components/Card'
import { useData } from '../useData'
import { fmtPct, fmtAUC, MODEL_LABELS } from '../utils'

interface VariantsData {
  variant_a_dnn_early_stopping: {
    title: string
    description: string
    hypothesis: string
    status: string
    models?: Record<string, Record<string, { mean: number; std: number }>>
    deltas_vs_baseline?: Record<string, {
      baseline_accuracy: number
      variant_a_accuracy: number
      delta_accuracy_pp: number
      baseline_auc: number
      variant_a_auc: number
      delta_auc_pp: number
    }>
  }
  variant_b_median_imputation: {
    title: string
    description: string
    hypothesis: string
    status: string
    models: Record<string, Record<string, { mean: number; std: number }>>
    deltas_vs_baseline?: Record<string, {
      baseline_accuracy: number
      variant_b_accuracy: number
      delta_accuracy_pp: number
      baseline_auc: number
      variant_b_auc: number
      delta_auc_pp: number
    }>
  }
}

export default function Experiments() {
  const { data } = useData()
  const [variants, setVariants] = useState<VariantsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/variants.json`)
      .then((res) => {
        const ct = res.headers.get('content-type') || ''
        if (!res.ok || !ct.includes('application/json')) {
          throw new Error('variants.json not available or not json')
        }
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
    return <div className="p-8 text-muted">Loading experimental variants...</div>
  }

  if (!variants) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 text-center">
        <FlaskConical size={48} className="text-muted mx-auto mb-4" />
        <h3 className="text-lg font-bold text-text mb-2">No Experimental Variants Available</h3>
        <p className="text-sm text-muted leading-relaxed">
          Experimental variant results could not be loaded. Ensure <code className="text-teal font-mono">results_variants/</code> data has been generated.
        </p>
      </div>
    )
  }

  const varB = variants.variant_b_median_imputation
  const varA = variants.variant_a_dnn_early_stopping

  return (
    <div className="max-w-[1240px] mx-auto px-5 py-6">
      {/* Prominent Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <div className="flex gap-2 items-center mb-2">
          <Badge variant="mine">Methodological Bonus</Badge>
          <Badge variant="warning">Supplementary Investigation</Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight mb-2">
          Experimental Exploration: Model Improvement Variants
        </h1>
        <p className="text-sm text-muted max-w-3xl leading-relaxed">
          Independent exploratory experiments addressing data artifacts and deep learning instability identified during replication.
        </p>
      </motion.div>

      {/* Strict Separation Notice */}
      <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-7 text-xs sm:text-sm text-text">
        <ShieldAlert size={20} className="text-amber flex-shrink-0" />
        <div>
          <b>Protocol Integrity Notice:</b> These variants are strictly supplementary and evaluated in <code className="text-amber font-mono">results_variants/</code>. They do <b>NOT</b> alter or replace the paper-faithful replication numbers recorded in <code className="text-teal font-mono">results_heart/</code>.
        </div>
      </div>

      <div className="space-y-7">
        {/* Variant B: Median Imputation */}
        <Card className="border-l-4 border-l-teal">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-lg font-bold text-text">
              {varB.title}
            </h3>
            <Badge variant="success">Executed (5 Seeds)</Badge>
          </div>
          <p className="text-sm text-muted leading-relaxed mb-4">
            {varB.description}
          </p>

          <div className="bg-elevated p-3.5 rounded-xl mb-5 text-xs sm:text-sm border border-border">
            <span className="text-muted font-bold">Hypothesis: </span>
            <span className="text-text">{varB.hypothesis}</span>
          </div>

          {/* Comparison Table: Paper-Faithful vs Imputed Variant B */}
          {varB.models && data && (
            <div>
              <div className="text-sm font-bold text-text mb-2.5">
                Performance Comparison: Paper-Faithful Replication vs. Imputed Variant B
              </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-elevated/60 text-muted">
                      <th className="py-2.5 px-3 text-left">Model</th>
                      <th className="py-2.5 px-3 text-center">Paper-Faithful Acc</th>
                      <th className="py-2.5 px-3 text-center text-teal">Variant B Acc</th>
                      <th className="py-2.5 px-3 text-center">Acc Change</th>
                      <th className="py-2.5 px-3 text-center">Paper-Faithful AUC</th>
                      <th className="py-2.5 px-3 text-center text-teal">Variant B AUC</th>
                      <th className="py-2.5 px-3 text-center">AUC Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['NB', 'DT', 'RF', 'SVM', 'LR'].map((m) => {
                      const faithfulAcc = data.results[m]?.stats.accuracy?.mean ?? 0
                      const faithfulAuc = data.results[m]?.stats.auc?.mean ?? 0
                      const vbAcc = varB.models[m]?.accuracy?.mean ?? 0
                      const vbAuc = varB.models[m]?.auc?.mean ?? 0
                      const diffAcc = vbAcc - faithfulAcc
                      const diffAuc = vbAuc - faithfulAuc

                      return (
                        <tr key={m} className="border-b border-border/60 hover:bg-elevated/40">
                          <td className="py-2.5 px-3 font-bold text-text">
                            {m} <span className="font-normal text-muted">({MODEL_LABELS[m]})</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-amber">
                            {fmtPct(faithfulAcc)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-teal font-bold">
                            {fmtPct(vbAcc)}
                          </td>
                          <td className={`py-2.5 px-3 text-center font-mono font-semibold ${diffAcc >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {diffAcc >= 0 ? '+' : ''}{(diffAcc * 100).toFixed(2)} pp
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-amber">
                            {fmtAUC(faithfulAuc)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-teal font-bold">
                            {fmtAUC(vbAuc)}
                          </td>
                          <td className={`py-2.5 px-3 text-center font-mono font-semibold ${diffAuc >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {diffAuc >= 0 ? '+' : ''}{(diffAuc * 100).toFixed(2)} pp
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-muted mt-3">
                <b>Finding:</b> Test accuracy shifts by only ~0.1 to ~1.0 percentage points when zero cholesterol is imputed, demonstrating that other physiological variables carry robust diagnostic signal, even while individual patient predictions shift when zero is forced.
              </div>
            </div>
          )}
        </Card>

        {/* Variant A: DNN Early Stopping */}
        <Card className="border-l-4 border-l-amber">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-lg font-bold text-text">
              {varA.title}
            </h3>
            <Badge variant={varA.status === 'executed' ? 'success' : 'default'}>
              {varA.status === 'executed' ? 'Executed' : 'Not run (requires TensorFlow)'}
            </Badge>
          </div>
          <p className="text-sm text-muted leading-relaxed mb-4">
            {varA.description}
          </p>

          <div className="bg-elevated p-3.5 rounded-xl text-xs sm:text-sm border border-border space-y-2">
            <div className="flex items-center gap-2 font-bold text-text">
              <Info size={16} className="text-teal" />
              <span>Diagnostic Protocol & Rationale:</span>
            </div>
            <p className="text-muted leading-relaxed">
              In the paper-faithful setup, DNN hyperparameters were chosen by last-epoch validation accuracy on an unconstrained 50-epoch schedule. This setup permitted late-epoch loss divergence during cross-seed tuning (e.g. Seed 44 validation loss ascending from its minimum).
            </p>
            <p className="text-muted leading-relaxed">
              {varA.status === 'executed'
                ? 'Variant A was executed across all 5 seeds, applying EarlyStopping(patience=10) and selecting hyperparameter configurations by minimum validation loss.'
                : 'Status: Not run in this runtime environment (TensorFlow is not present). The documented protocol specifies tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True) with configuration selection by minimum validation loss.'}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
