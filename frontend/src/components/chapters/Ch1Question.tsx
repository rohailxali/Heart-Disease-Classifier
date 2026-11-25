import React from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import type { Meta } from '../../schemas'
import { Button } from '../Button'
import { Chip } from '../Chip'

interface Ch1Props {
  meta: Meta
}

const HERO_ECG_PATH =
  'M 0 36 L 140 36 Q 152 29, 164 36 L 184 36 L 192 43 L 201 7 L 210 61 L 219 36 Q 238 23, 256 36 L 410 36 Q 422 29, 434 36 L 454 36 L 462 43 L 471 7 L 480 61 L 489 36 Q 508 23, 526 36 L 760 36'

export function Ch1Question({ meta }: Ch1Props) {
  const reduceMotion = useReducedMotion()

  const scrollToCh2 = () => {
    const el = document.getElementById('ch2')
    el?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <section id="ch1" aria-labelledby="ch1-heading" className="pt-10 sm:pt-16 pb-6 scroll-mt-20">
      <div className="notebook-column sidenote-anchor">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Chip variant="neutral">Chapter I · The Question</Chip>
          <Chip variant="paper" dot>
            {meta.paper.journal} {meta.paper.volume}({meta.paper.issue}), {meta.paper.year}
          </Chip>
        </div>

        {/* Hero ECG trace drawn once on load directly under the display headline */}
        <h1
          id="ch1-heading"
          className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-ink tracking-tight leading-[1.06] mb-3"
        >
          Does a neural network beat classical machine learning on 918 patients?
        </h1>

        <div aria-hidden="true" className="w-full my-5">
          <svg viewBox="0 0 760 68" className="w-full h-14 overflow-visible">
            <path
              d="M 0 36 L 760 36"
              stroke="var(--color-rule)"
              strokeWidth="0.75"
              strokeDasharray="3 4"
            />
            {reduceMotion ? (
              <path
                d={HERO_ECG_PATH}
                fill="none"
                stroke="var(--color-oxblood)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <motion.path
                d={HERO_ECG_PATH}
                fill="none"
                stroke="var(--color-oxblood)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0.4 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </svg>
        </div>

        <p className="font-display text-lg sm:text-xl text-ink/90 leading-relaxed mb-5">
          {meta.paper.authors} ({meta.paper.year}) reported in{' '}
          <em>“{meta.paper.title}”</em> that a three-layer Deep Neural Network reached{' '}
          <span className="font-mono text-base sm:text-lg text-slate font-medium">89%</span>{' '}
          accuracy and{' '}
          <span className="font-mono text-base sm:text-lg text-slate font-medium">0.94</span>{' '}
          AUC on the Kaggle Heart Failure dataset—tying SVM on accuracy and edging past Random Forest.
        </p>

        <p className="text-base text-ink/85 leading-relaxed mb-6">
          I re-ran the study five times across five stratified random seeds ({meta.seeds.join(', ')}).
          With {meta.split.test} held-out patients per test split ({meta.split.disease_in_test} with heart disease,{' '}
          {meta.split.healthy_in_test} healthy), a single misclassified patient moves accuracy by{' '}
          <span className="font-mono text-sm font-medium text-ink">
            {meta.one_patient_pct.toFixed(2)} percentage points
          </span>
          . Before declaring a winner from a single split, I wanted to see what survives repeated resampling—and what shortcuts the models are actually learning.
        </p>

        <div className="border-t border-b border-rule py-3.5 px-1 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-muted mb-7">
          <div>
            Source paper: <span className="text-ink">{meta.paper.authors}</span>,{' '}
            <span>{meta.paper.journal}</span> {meta.paper.volume}({meta.paper.issue}), pp. {meta.paper.pages}
          </div>
          <div>
            Cohort: <span className="text-ink">{meta.dataset.rows} rows × {meta.dataset.columns} cols</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="md" onClick={scrollToCh2}>
            <span>Read the notebook</span>
            <ArrowDown size={15} aria-hidden="true" />
          </Button>
          <Link to="/workbench">
            <Button variant="secondary" size="md">
              <span>Open Workbench</span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </Button>
          </Link>
          <Link to="/predict">
            <Button variant="outline" size="md">
              <span>Consultation Sheet (/predict)</span>
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
