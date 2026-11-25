import React from 'react'
import { useData } from '../useData'
import { SectionDivider } from '../components/SectionDivider'
import { Ch1Question } from '../components/chapters/Ch1Question'
import { Ch2Patients } from '../components/chapters/Ch2Patients'
import { Ch3Method } from '../components/chapters/Ch3Method'
import { Ch4Replication } from '../components/chapters/Ch4Replication'
import { Ch5Gap } from '../components/chapters/Ch5Gap'
import { Ch6Catches } from '../components/chapters/Ch6Catches'
import { Ch7Colophon } from '../components/chapters/Ch7Colophon'

export default function Home() {
  const { data, loading, error } = useData()

  if (loading) {
    return (
      <div className="notebook-column py-24 text-sm font-mono text-muted">
        Loading replication records…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="notebook-column py-20 border-t border-b border-oxblood text-sm text-oxblood font-mono">
        Failed to load study JSON contracts: {error || 'Unknown error'}
      </div>
    )
  }

  return (
    <article className="pb-24 overflow-x-clip">
      <Ch1Question meta={data.meta} />
      <SectionDivider variant="wave" />
      <Ch2Patients eda={data.eda} />
      <SectionDivider variant="cell" />
      <Ch3Method meta={data.meta} assumptions={data.assumptions} />
      <SectionDivider variant="wave" />
      <Ch4Replication results={data.results} curves={data.curves} meta={data.meta} />
      <SectionDivider variant="cell" />
      <Ch5Gap comparison={data.comparison} />
      <SectionDivider variant="wave" />
      <Ch6Catches
        eda={data.eda}
        meta={data.meta}
        results={data.results}
        variants={data.variants}
      />
      <SectionDivider variant="cell" />
      <Ch7Colophon meta={data.meta} assumptions={data.assumptions} />
    </article>
  )
}
