import React from 'react'
import type { Eda } from '../../schemas'
import { Chip } from '../Chip'
import { Numeral } from '../Numeral'
import { Sidenote } from '../Sidenote'
import { PatientCohortViz } from '../charts/PatientCohortViz'
import { FeatureDistChart } from '../charts/FeatureDistChart'

interface Ch2Props {
  eda: Eda
}

export function Ch2Patients({ eda }: Ch2Props) {
  const dq = eda.data_quality
  const sexCounts = eda.cat_counts.Sex || {}
  const maleTotal = (sexCounts.M?.healthy ?? 0) + (sexCounts.M?.disease ?? 0)
  const femaleTotal = (sexCounts.F?.healthy ?? 0) + (sexCounts.F?.disease ?? 0)

  return (
    <section id="ch2" aria-labelledby="ch2-heading" className="py-6 scroll-mt-20">
      <div className="notebook-column sidenote-anchor">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Chip variant="neutral">Chapter II · The Patients</Chip>
          <Chip variant="neutral">{dq.total_rows} records · 0 NaNs</Chip>
        </div>

        <h2
          id="ch2-heading"
          className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-5"
        >
          Clean on the surface, skewed underneath
        </h2>

        <p className="text-base text-ink/90 leading-relaxed mb-5">
          The Kaggle Heart Failure compilation merges five clinical cohorts totaling{' '}
          <strong className="font-mono text-sm">{dq.total_rows}</strong> patient visits ({maleTotal} men, {femaleTotal} women):{' '}
          <span className="font-mono text-sm font-medium text-oxblood">{eda.class_counts.disease} heart disease</span>{' '}
          ({((eda.class_counts.disease / dq.total_rows) * 100).toFixed(1)}%) and{' '}
          <span className="font-mono text-sm font-medium text-green">{eda.class_counts.healthy} healthy</span>{' '}
          ({((eda.class_counts.healthy / dq.total_rows) * 100).toFixed(1)}%). Standard completeness checks look spotless: {dq.missing_values} missing entries and {dq.duplicates} exact duplicate rows.
          <Sidenote index={2}>
            Merging multi-center cohorts (Cleveland, Hungarian, Switzerland, Long Beach VA, Stalog) explains why unmeasured serum cholesterol from the Swiss subset arrived encoded as literal zero rather than NaN.
          </Sidenote>
        </p>

        <p className="text-base text-ink/90 leading-relaxed mb-6">
          That apparent cleanliness hides a structural artifact. Serum cholesterol equals <span className="font-mono text-sm">0 mg/dl</span> in{' '}
          <strong className="font-mono text-sm">{dq.zero_cholesterol_rows}</strong> patients ({((dq.zero_cholesterol_rows / dq.total_rows) * 100).toFixed(1)}% of the dataset), and resting blood pressure is zero in {dq.zero_restingbp_rows} row. Because those zero entries almost exclusively sit in one clinical center with high referral severity,{' '}
          <strong className="text-oxblood font-mono text-sm">{dq.disease_rate_zero_cholesterol_pct}%</strong> of zero-cholesterol patients have heart disease versus{' '}
          <strong className="font-mono text-sm">{dq.disease_rate_nonzero_cholesterol_pct}%</strong> when cholesterol is measured above zero.
        </p>

        {/* Display Numerals Strip */}
        <div className="border-t border-b border-rule py-6 my-7 grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-0 sm:divide-x sm:divide-rule">
          <div className="sm:pr-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">
              Total Patient Cohort
            </div>
            <Numeral value={dq.total_rows} decimals={0} size="lg" className="text-ink" />
            <div className="font-mono text-xs text-muted mt-2">
              {eda.class_counts.disease} disease / {eda.class_counts.healthy} healthy
            </div>
          </div>

          <div className="sm:px-5 pt-4 sm:pt-0 border-t sm:border-t-0 border-rule/60">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">
              Disease Rate (Chol = 0)
            </div>
            <Numeral value={dq.disease_rate_zero_cholesterol_pct} decimals={2} suffix="%" size="lg" className="text-oxblood" />
            <div className="font-mono text-xs text-muted mt-2">
              {dq.cholesterol_zero_x_disease?.zero_chol_disease ?? 152} of {dq.zero_cholesterol_rows} rows
            </div>
          </div>

          <div className="sm:pl-5 pt-4 sm:pt-0 border-t sm:border-t-0 border-rule/60">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">
              Disease Rate (Chol &gt; 0)
            </div>
            <Numeral value={dq.disease_rate_nonzero_cholesterol_pct} decimals={2} suffix="%" size="lg" className="text-slate" />
            <div className="font-mono text-xs text-muted mt-2">
              {dq.cholesterol_zero_x_disease?.nonzero_chol_disease ?? 356} of {dq.cholesterol_zero_x_disease?.total_nonzero_chol ?? 746} rows
            </div>
          </div>
        </div>
      </div>

      <div className="notebook-wide">
        <PatientCohortViz eda={eda} />
        <FeatureDistChart eda={eda} />
      </div>
    </section>
  )
}
