import React from 'react'
import type { Meta, Assumption } from '../../schemas'
import { Chip } from '../Chip'
import { Sidenote } from '../Sidenote'

interface Ch3Props {
  meta: Meta
  assumptions: Assumption[]
}

export function Ch3Method({ meta, assumptions }: Ch3Props) {
  const paperSpecs = assumptions.filter(a => a.source === 'paper')
  const filledGaps = assumptions.filter(a => a.source === 'assumption')

  return (
    <section id="ch3" aria-labelledby="ch3-heading" className="py-6 scroll-mt-20">
      <div className="notebook-column sidenote-anchor">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Chip variant="neutral">Chapter III · The Method</Chip>
          <Chip variant="paper" dot>{paperSpecs.length} paper specs</Chip>
          <Chip variant="replication" dot>{filledGaps.length} explicit assumptions</Chip>
        </div>

        <h2
          id="ch3-heading"
          className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-5"
        >
          Leak-free pipelines and the choices the paper left blank
        </h2>

        <p className="text-base text-ink/90 leading-relaxed mb-6">
          To keep evaluation apples-to-apples, I wrapped every classical estimator inside a scikit-learn{' '}
          <code className="font-mono text-sm px-1.5 py-0.5 bg-surface border border-rule">Pipeline</code>: scaling continuous columns with{' '}
          <code className="font-mono text-sm">StandardScaler</code> and one-hot encoding categorical fields strictly inside each cross-validation fold so zero test distribution statistics leak into training.
          <Sidenote index={3}>
            In the baseline replication, zero values in Cholesterol and RestingBP are left untouched to faithfully mirror Simanjuntak et al. (2025). Variant B in Chapter VI tests median imputation inside folds.
          </Sidenote>
        </p>
      </div>

      {/* Wide 4-Step Methodological Schematic */}
      <div className="notebook-wide my-7">
        <div className="border-t border-b border-rule py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">01 · Split</div>
            <div className="font-display text-lg font-semibold text-ink">80:20 Stratified</div>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              {meta.split.train} train / {meta.split.test} test ({meta.split.disease_in_test} disease, {meta.split.healthy_in_test} healthy) repeated across seeds {meta.seeds.join(', ')}.
            </p>
          </div>

          <div className="sm:border-l border-rule/70 sm:pl-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">02 · Preprocess</div>
            <div className="font-display text-lg font-semibold text-ink">ColumnTransformer</div>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              StandardScaler on 5 numeric inputs + OneHotEncoder on 6 clinical categories, fit only on training folds.
            </p>
          </div>

          <div className="lg:border-l border-rule/70 lg:pl-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">03 · Tune</div>
            <div className="font-display text-lg font-semibold text-ink">5-Fold CV &amp; Val Split</div>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              GridSearchCV (scoring=accuracy) for NB, DT, RF, SVM, LR; 20% val split over batch/lr/epochs for 64-32-16 DNN.
            </p>
          </div>

          <div className="sm:border-l border-rule/70 sm:pl-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">04 · Evaluate</div>
            <div className="font-display text-lg font-semibold text-ink">Unseen Holdout</div>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Every tuned model refits on all {meta.split.train} training patients and scores once on {meta.split.test} held-out patients.
            </p>
          </div>
        </div>
      </div>

      <div className="notebook-column">
        {/* Side-by-side Paper Specs vs Assumptions Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="border-t border-slate pt-3">
            <div className="font-mono text-[11px] uppercase tracking-wider text-slate mb-2">
              Specified by Paper ({paperSpecs.length})
            </div>
            <ul className="space-y-2 text-xs text-ink/85 leading-relaxed list-disc pl-4">
              {paperSpecs.map(a => (
                <li key={a.id}>{a.text}</li>
              ))}
            </ul>
          </div>

          <div className="border-t border-ochre pt-3">
            <div className="font-mono text-[11px] uppercase tracking-wider text-ochreInk mb-2">
              Disclosed Implementation Assumptions ({filledGaps.length})
            </div>
            <ul className="space-y-2 text-xs text-ink/85 leading-relaxed list-disc pl-4">
              {filledGaps.map(a => (
                <li key={a.id}>{a.text}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
