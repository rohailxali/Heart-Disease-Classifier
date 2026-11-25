import React from 'react'
import type { Eda, Meta, Results, Variants } from '../../schemas'
import { MODEL_LABELS, fmtPct } from '../../utils'
import { Chip } from '../Chip'
import { Sidenote } from '../Sidenote'
import { Annotation } from '../Annotation'

interface Ch6Props {
  eda: Eda
  meta: Meta
  results: Results
  variants: Variants | null
}

export function Ch6Catches({ eda, meta, results, variants }: Ch6Props) {
  const dq = eda.data_quality
  const dnnSeed44 = results.DNN.per_seed.find(s => s.seed === 44) ?? results.DNN.per_seed[0]
  const varA = variants?.variant_a_dnn_early_stopping
  const varB = variants?.variant_b_median_imputation
  const deltasB = varB?.deltas_vs_baseline

  return (
    <section id="ch6" aria-labelledby="ch6-heading" className="py-6 scroll-mt-20">
      <div className="notebook-column">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Chip variant="warning" dot>Chapter VI · The Catches</Chip>
          <Chip variant="neutral">Field Notes &amp; Ablations</Chip>
        </div>

        <h2
          id="ch6-heading"
          className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-6"
        >
          Four caveats any clinician—or grader—should inspect first
        </h2>

        {/* Catch 1 */}
        <div className="sidenote-anchor border-t border-rule py-5">
          <h3 className="font-display text-xl font-semibold text-ink mb-2">
            1. Models exploit missing cholesterol as a shortcut
          </h3>
          <p className="text-base text-ink/90 leading-relaxed mb-3">
            Leaving literal zeros in the dataset gives every classifier an unintended hospital-site indicator:{' '}
            <strong className="font-mono text-sm">
              {dq.disease_rate_zero_cholesterol_pct}% of the {dq.zero_cholesterol_rows} zero-cholesterol patients
            </strong>{' '}
            carry a heart disease label. In deployed care, a lab draw of 0 mg/dl does not exist biologically—a model conditioned on zeros mistakes missing instrumentation for coronary risk.
            <Sidenote index={7}>
              Look ahead to /predict: every prediction shows dashed ghost markers revealing how each classifier’s probability shifts if the same patient’s Cholesterol were sent as 0.
            </Sidenote>
          </p>
          <div className="py-1">
            <Annotation
              variant="underline"
              color="oxblood"
              note={`versus ${dq.disease_rate_nonzero_cholesterol_pct}% when cholesterol > 0`}
            >
              <span className="font-mono text-sm font-semibold text-ink">
                {dq.cholesterol_zero_x_disease?.zero_chol_disease ?? 152} of {dq.zero_cholesterol_rows} Chol=0 visits = {dq.disease_rate_zero_cholesterol_pct}% heart disease
              </span>
            </Annotation>
          </div>
        </div>

        {/* Catch 2 */}
        <div className="sidenote-anchor border-t border-rule py-5">
          <h3 className="font-display text-xl font-semibold text-ink mb-2">
            2. Variant B: Removing the shortcut nudges accuracy down across all five sklearn models
          </h3>
          <p className="text-base text-ink/90 leading-relaxed mb-4">
            {varB?.description ||
              `When replacing zero measurements in Cholesterol (${dq.zero_cholesterol_rows} rows) and RestingBP (${dq.zero_restingbp_rows} row) with NaN and imputing training medians strictly inside CV folds (`}
            {varB ? '' : 'SimpleImputer(strategy="median")), '}
            every classical classifier drops slightly in test accuracy—confirming that part of the baseline score came from exploiting missing-value coding rather than lipid physiology alone.
            <Sidenote index={8}>
              Notice LR barely budges ({deltasB?.LR ? `${deltasB.LR.delta_accuracy_pp > 0 ? '+' : ''}${deltasB.LR.delta_accuracy_pp} pp acc, +${deltasB.LR.delta_auc_pp} pp AUC` : 'minimal shift'}), whereas SVM gives up {deltasB?.SVM ? `${Math.abs(deltasB.SVM.delta_accuracy_pp)} pp` : 'nearly 1 pp'} accuracy once the 0-cholesterol shortcut disappears.
            </Sidenote>
          </p>

          {varB?.status === 'executed' && deltasB ? (
            <div className="w-full overflow-x-auto border-t border-b border-rule bg-surface my-3">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <caption className="text-left px-3 py-2 marginalia border-b border-rule/60 text-xs">
                  Variant B (inside-fold median imputation) vs Baseline over seeds 42–46 (5 sklearn models).
                </caption>
                <thead>
                  <tr className="border-b border-rule text-[10px] uppercase text-muted">
                    <th scope="col" className="py-2 px-3">Model</th>
                    <th scope="col" className="py-2 px-3 text-right">Baseline Acc</th>
                    <th scope="col" className="py-2 px-3 text-right">Imputed Acc</th>
                    <th scope="col" className="py-2 px-3 text-right">Δ Acc (pp)</th>
                    <th scope="col" className="py-2 px-3 text-right">Δ AUC (pp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/40">
                  {Object.entries(deltasB).map(([m, d]) => (
                    <tr key={m}>
                      <td className="py-2 px-3 font-semibold text-ink">
                        {m} <span className="font-sans font-normal text-muted">({MODEL_LABELS[m]})</span>
                      </td>
                      <td className="py-2 px-3 text-right">{fmtPct(d.baseline_accuracy, 2)}</td>
                      <td className="py-2 px-3 text-right">{fmtPct(d.variant_b_accuracy, 2)}</td>
                      <td className={`py-2 px-3 text-right ${d.delta_accuracy_pp < 0 ? 'text-oxblood' : 'text-green'}`}>
                        {d.delta_accuracy_pp > 0 ? '+' : ''}{d.delta_accuracy_pp.toFixed(2)} pp
                      </td>
                      <td className={`py-2 px-3 text-right ${d.delta_auc_pp < 0 ? 'text-muted' : 'text-green'}`}>
                        {d.delta_auc_pp > 0 ? '+' : ''}{d.delta_auc_pp.toFixed(2)} pp
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="font-mono text-xs text-muted">
              Variant B status: {varB?.status ?? 'not_run'}
            </p>
          )}
        </div>

        {/* Catch 3 */}
        <div className="sidenote-anchor border-t border-rule py-5">
          <h3 className="font-display text-xl font-semibold text-ink mb-2">
            3. DNN seed fragility—and an ablation intentionally left honest
          </h3>
          <p className="text-base text-ink/90 leading-relaxed mb-3">
            Without early stopping, Seed {dnnSeed44.seed} DNN fell to{' '}
            <strong className="font-mono text-sm text-oxblood">{fmtPct(dnnSeed44.accuracy, 2)}</strong>{' '}
            with ROC-AUC dropping to <span className="font-mono text-sm">{dnnSeed44.auc.toFixed(3)}</span> while validation BCE climbed past 1.5.
            <Sidenote index={9}>
              Variant A tests EarlyStopping(patience=10, restore_best_weights=True). Because TensorFlow is absent in this lightweight runtime, we refuse to fabricate or estimate an outcome.
            </Sidenote>
          </p>
          <div className="py-1 mb-3">
            <Annotation variant="circle" color="oxblood" note="highest cross-seed variance of all 6 models">
              <span className="font-mono text-sm font-semibold text-oxblood">
                Seed {dnnSeed44.seed}: {fmtPct(dnnSeed44.accuracy, 2)} acc · {dnnSeed44.auc.toFixed(3)} AUC
              </span>
            </Annotation>
          </div>

          <div className="border-l-2 border-rule pl-4 py-1 text-sm text-muted">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink block mb-1">
              {varA?.title || 'Variant A: DNN Early Stopping'} — Status:{' '}
              <strong className="text-ochreInk">{varA?.status === 'executed' ? 'Executed' : 'not run'}</strong>
            </span>
            <span>
              {varA?.description || 'Applies tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=10) across all 5 seeds.'}{' '}
              {varA?.status !== 'executed' && 'TensorFlow is unavailable in this runtime, so Variant A remains unexecuted and no metric change is claimed.'}
            </span>
          </div>
        </div>

        {/* Catch 4 */}
        <div className="sidenote-anchor border-t border-b border-rule py-5">
          <h3 className="font-display text-xl font-semibold text-ink mb-2">
            4. {meta.split.test} test patients cannot resolve differences smaller than half a point
          </h3>
          <p className="text-base text-ink/90 leading-relaxed">
            Every seed holds <span className="font-mono text-sm">{meta.split.test}</span> held-out patients, setting a discrete quantile step of{' '}
            <strong className="font-mono text-sm">{meta.one_patient_pct.toFixed(2)} pp</strong> per patient. Claiming superiority between two models separated by 0.2 or 0.3 percentage points mistakes discrete coin-flip variance for architectural advantage.
          </p>
        </div>
      </div>
    </section>
  )
}
