import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import type { Results, Curves, Meta } from '../../schemas'
import { MODELS, MODEL_LABELS, fmtPct, fmtAUC } from '../../utils'
import { Chip } from '../Chip'
import { Numeral } from '../Numeral'
import { Sidenote } from '../Sidenote'
import { Annotation } from '../Annotation'
import { StripPlotChart } from '../charts/StripPlotChart'
import { ConfusionDotsViz } from '../charts/ConfusionDotsViz'
import { TrainingCurvesChart } from '../charts/TrainingCurvesChart'

interface Ch4Props {
  results: Results
  curves: Curves
  meta: Meta
}

export function Ch4Replication({ results, curves, meta }: Ch4Props) {
  const bestAccModel = useMemo(() => {
    return [...MODELS].sort((a, b) => (results[b].stats.accuracy.mean ?? 0) - (results[a].stats.accuracy.mean ?? 0))[0]
  }, [results])

  const bestAucModel = useMemo(() => {
    return [...MODELS].sort((a, b) => (results[b].stats.auc.mean ?? 0) - (results[a].stats.auc.mean ?? 0))[0]
  }, [results])

  const svmMeanAccPct = (results[bestAccModel].stats.accuracy.mean ?? 0) * 100
  const svmMeanAuc = results[bestAucModel].stats.auc.mean ?? 0
  const lrMeanAccPct = (results.LR.stats.accuracy.mean ?? 0) * 100
  const rfMeanAccPct = (results.RF.stats.accuracy.mean ?? 0) * 100
  const dnnSeed44 = results.DNN.per_seed.find(s => s.seed === 44) ?? results.DNN.per_seed[0]
  const dnnMeanAccPct = (results.DNN.stats.accuracy.mean ?? 0) * 100
  const dnnMeanAuc = results.DNN.stats.auc.mean ?? 0

  return (
    <section id="ch4" aria-labelledby="ch4-heading" className="py-6 scroll-mt-20">
      <div className="notebook-column sidenote-anchor">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Chip variant="replication" dot>Chapter IV · The Replication</Chip>
          <Chip variant="neutral">Mean ± SD over {meta.seeds.length} seeds</Chip>
        </div>

        <h2
          id="ch4-heading"
          className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-5"
        >
          {bestAccModel} leads over five splits; the neural network finishes fifth
        </h2>

        <p className="text-base text-ink/90 leading-relaxed mb-6">
          Averaged across seeds {meta.seeds[0]} through {meta.seeds[meta.seeds.length - 1]} ({meta.seeds.length * meta.split.test} total test evaluations),{' '}
          <strong>{MODEL_LABELS[bestAccModel]} ({bestAccModel})</strong> sets the highest accuracy and ROC-AUC, closely trailed by Logistic Regression ({lrMeanAccPct.toFixed(1)}%) and Random Forest ({rfMeanAccPct.toFixed(1)}%). The 3-layer Deep Neural Network averages {dnnMeanAccPct.toFixed(1)}% accuracy and {fmtAUC(dnnMeanAuc)} AUC—behind SVM, LR, RF, and even Naïve Bayes in overall accuracy.
          <Sidenote index={4}>
            On small tabular cohorts (n={meta.split.train} training rows), well-regularized kernel and linear boundaries routinely match or outperform unconstrained multi-layer perceptrons.
          </Sidenote>
        </p>

        {/* Typographic Display Numerals (separated by hairlines, no card boxes) */}
        <div className="border-t border-b border-rule py-6 my-7 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0 sm:divide-x sm:divide-rule">
          <div className="sm:pr-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">
              #1 Mean Accuracy ({bestAccModel})
            </div>
            <Numeral value={svmMeanAccPct} decimals={1} suffix="%" size="lg" className="text-ink" />
            <div className="font-mono text-xs text-muted mt-2">
              {fmtPct(results[bestAccModel].stats.accuracy.mean ?? 0, 2)} ± {((results[bestAccModel].stats.accuracy.std ?? 0) * 100).toFixed(2)} pp (5 seeds)
            </div>
          </div>

          <div className="sm:px-5 pt-4 sm:pt-0 border-t sm:border-t-0 border-rule/60">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">
              #1 Mean ROC-AUC ({bestAucModel})
            </div>
            <Numeral value={svmMeanAuc} decimals={3} size="lg" className="text-ochreInk" />
            <div className="font-mono text-xs text-muted mt-2">
              {fmtAUC(svmMeanAuc)} ± {(results[bestAucModel].stats.auc.std ?? 0).toFixed(4)} (5 seeds)
            </div>
          </div>

          <div className="sm:pl-5 pt-4 sm:pt-0 border-t sm:border-t-0 border-rule/60">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">
              Lowest Split (DNN Seed {dnnSeed44.seed})
            </div>
            <Annotation variant="circle" color="oxblood" note={`AUC dropped to ${fmtAUC(dnnSeed44.auc)}`}>
              <Numeral value={dnnSeed44.accuracy * 100} decimals={1} suffix="%" size="lg" className="text-oxblood" />
            </Annotation>
          </div>
        </div>
      </div>

      {/* Full-width Strip Plot Figure */}
      <div className="notebook-wide">
        <StripPlotChart results={results} />
      </div>

      <div className="notebook-column sidenote-anchor my-8">
        <p className="text-base text-ink/90 leading-relaxed">
          Look closely at the narrow clustering among the top three classifiers. Across five seeds, only{' '}
          <span className="font-mono text-sm font-medium text-ink">
            {((svmMeanAccPct - rfMeanAccPct)).toFixed(2)} percentage points
          </span>{' '}
          separate {bestAccModel} ({svmMeanAccPct.toFixed(1)}%) from Random Forest ({rfMeanAccPct.toFixed(1)}%).
          Because each test split holds {meta.split.test} patients, reversing the outcome of a single borderline patient flips test accuracy by{' '}
          <span className="font-mono text-sm font-medium text-ink">{meta.one_patient_pct.toFixed(2)} pp</span>.
          Rank orderings among the top models are therefore smaller than one patient of sampling noise.
          <Sidenote index={5}>
            Try clicking “−1 dot” or “+1 dot” below to confirm that one test patient changes accuracy by more than the gap between SVM, LR, and RF.
          </Sidenote>
        </p>
      </div>

      {/* Full-width 184 Dots per Seed Figure */}
      <div className="notebook-wide">
        <ConfusionDotsViz results={results} onePatientPct={meta.one_patient_pct} />
      </div>

      <div className="notebook-column sidenote-anchor my-8">
        <p className="text-base text-ink/90 leading-relaxed">
          Why did DNN stumble on Seed {dnnSeed44.seed}? The grid search tunes epochs ∈ {'{20, 50}'} by final-epoch validation accuracy without early stopping.
          On Seed 44, training kept driving down training loss across all 50 epochs while validation loss diverged above 1.5—a classic signature of small-dataset memorization.
        </p>
      </div>

      {/* Full-width DNN Training Curves */}
      <div className="notebook-wide">
        <TrainingCurvesChart curves={curves} />

        <div className="flex justify-end mt-2">
          <Link to="/workbench" className="inline-flex items-center gap-1 font-mono text-xs text-slate hover:underline">
            <span>Inspect full numeric tables in the Workbench</span>
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
