import React, { useMemo } from 'react'
import type { CompRow } from '../../schemas'
import { Chip } from '../Chip'
import { Sidenote } from '../Sidenote'
import { DumbbellChart } from '../charts/DumbbellChart'

interface Ch5Props {
  comparison: CompRow[]
}

export function Ch5Gap({ comparison }: Ch5Props) {
  const verdictCounts = useMemo(() => {
    const within = comparison.filter(r => r.verdict === 'within noise').length
    const higher = comparison.filter(r => r.verdict === 'higher').length
    const lower = comparison.filter(r => r.verdict === 'lower').length
    return { total: comparison.length, within, higher, lower }
  }, [comparison])

  const accRows = useMemo(() => {
    return comparison.filter(r => r.metric === 'accuracy')
  }, [comparison])

  const dtRow = accRows.find(r => r.model === 'DT')
  const dnnRow = accRows.find(r => r.model === 'DNN')

  return (
    <section id="ch5" aria-labelledby="ch5-heading" className="py-6 scroll-mt-20">
      <div className="notebook-column sidenote-anchor">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Chip variant="paper" dot>Chapter V · The Gap</Chip>
          <Chip variant="neutral">{verdictCounts.total} model × metric cells</Chip>
        </div>

        <h2
          id="ch5-heading"
          className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-5"
        >
          Comparing a single published run against five stratified seeds
        </h2>

        <p className="text-base text-ink/90 leading-relaxed mb-5">
          Simanjuntak et al. (2025) report one test-split score per metric with no variance estimate. When placed beside our 5-seed distribution (<em>mean ± SD over 5 seeds</em>),{' '}
          <strong className="font-mono text-sm">{verdictCounts.within} of {verdictCounts.total}</strong> model–metric cells fall within one standard deviation of our replication mean;{' '}
          <strong className="font-mono text-sm text-green">{verdictCounts.higher}</strong> are meaningfully higher in our run (mostly Decision Tree, where 5-fold CV tuning lifts accuracy from{' '}
          <span className="font-mono text-sm">{dtRow ? `${(dtRow.paper * 100).toFixed(0)}%` : '79%'}</span> paper single run to{' '}
          <span className="font-mono text-sm">{dtRow ? `${(dtRow.mine * 100).toFixed(1)}%` : '83.4%'}</span>), and{' '}
          <strong className="font-mono text-sm text-oxblood">{verdictCounts.lower}</strong> are lower.
          <Sidenote index={6}>
            The paper’s DNN score (89% accuracy, 0.94 AUC) sits above our 5-seed DNN mean ({dnnRow ? `${(dnnRow.mine * 100).toFixed(1)}%` : '86.0%'}, z = {dnnRow?.z?.toFixed(2) ?? '-1.66'}σ), consistent with picking a favorable single random split and validation stopping behavior.
          </Sidenote>
        </p>
      </div>

      {/* Full-width Dumbbell Chart */}
      <div className="notebook-wide">
        <DumbbellChart comparison={comparison} />
      </div>
    </section>
  )
}
