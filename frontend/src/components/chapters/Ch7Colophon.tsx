import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, ArrowUpRight } from 'lucide-react'
import type { Meta, Assumption } from '../../schemas'
import { Chip } from '../Chip'
import { SegmentedControl } from '../SegmentedControl'
import { DataTable, type Column } from '../DataTable'
import { Button } from '../Button'

interface Ch7Props {
  meta: Meta
  assumptions: Assumption[]
}

const REPRO_COMMANDS = {
  windows: `# 1. Activate environment & install pinned packages
python -m venv .venv
.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt

# 2. Export graded results & variants (do NOT re-run replicate_heart.py)
python improve_heart.py
python export_results.py

# 3. Train inference models & start notebook + API
python api/train_models.py --skip-dnn
cd frontend; npm install; npm run dev`,
  unix: `# 1. Activate environment & install pinned packages
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 2. Export graded results & variants (do NOT re-run replicate_heart.py)
python improve_heart.py
python export_results.py

# 3. Train inference models & start notebook + API
python api/train_models.py --skip-dnn
cd frontend && npm install && npm run dev`,
}

export function Ch7Colophon({ meta, assumptions }: Ch7Props) {
  const [osTab, setOsTab] = useState<'windows' | 'unix'>('windows')
  const [copied, setCopied] = useState(false)

  const copyCmds = async () => {
    try {
      await navigator.clipboard.writeText(REPRO_COMMANDS[osTab])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const cols: Column<Assumption>[] = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      sortValue: r => r.id,
      render: r => <span className="font-mono text-xs text-muted">{r.id}</span>,
    },
    {
      key: 'source',
      header: 'Origin',
      sortable: true,
      sortValue: r => r.source,
      render: r => (
        <Chip variant={r.source === 'paper' ? 'paper' : 'replication'} dot>
          {r.source === 'paper' ? 'Paper Spec' : 'Assumption'}
        </Chip>
      ),
    },
    {
      key: 'text',
      header: 'Methodological Specification',
      render: r => <span className="text-xs sm:text-sm text-ink/90 leading-snug">{r.text}</span>,
    },
  ]

  return (
    <section id="ch7" aria-labelledby="ch7-heading" className="py-6 scroll-mt-20">
      <div className="notebook-column space-y-10">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Chip variant="neutral">Chapter VII · Colophon</Chip>
            <Chip variant="neutral">Generated {meta.generated_at.slice(0, 10)}</Chip>
          </div>

          <h2
            id="ch7-heading"
            className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-4"
          >
            Reproducibility, environment &amp; integrity notes
          </h2>
          <p className="text-base text-ink/90 leading-relaxed">
            Every metric displayed in this notebook is parsed directly from CSV outputs written by <code className="font-mono text-sm">replicate_heart.py</code> and <code className="font-mono text-sm">improve_heart.py</code>, published through <code className="font-mono text-sm">export_results.py</code>, and schema-checked at runtime with Zod. Because TensorFlow ops are non-deterministic across host hardware, graded reference CSVs in <code className="font-mono text-sm">results_heart/</code> are preserved verbatim.
          </p>
        </div>

        {/* Reproducibility Commands */}
        <div className="border-t border-b border-rule py-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h3 className="font-display text-xl font-semibold text-ink">Run locally</h3>
            <div className="flex items-center gap-2">
              <SegmentedControl
                size="sm"
                name="colophon-os"
                ariaLabel="Operating system commands"
                value={osTab}
                onChange={v => setOsTab(v as 'windows' | 'unix')}
                options={[
                  { value: 'windows', label: 'PowerShell' },
                  { value: 'unix', label: 'Bash / macOS' },
                ]}
              />
              <Button variant="secondary" size="sm" onClick={copyCmds}>
                {copied ? <Check size={13} className="text-green" /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </div>

          <pre className="p-4 bg-surface border border-rule font-mono text-xs text-ink overflow-x-auto leading-relaxed">
            <code>{REPRO_COMMANDS[osTab]}</code>
          </pre>
        </div>

        {/* Assumptions Register */}
        <div>
          <h3 className="font-display text-xl font-semibold text-ink mb-3">
            Full Assumptions &amp; Parameter Register ({assumptions.length})
          </h3>
          <DataTable
            caption="Documented separation between explicit paper parameters and engineering assumptions."
            columns={cols}
            data={assumptions}
            keyField="id"
          />
        </div>

        {/* Environment + Integrity + Links */}
        <div className="border-t border-rule pt-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed">
          <div className="space-y-3">
            <div className="font-mono uppercase tracking-widest text-muted">
              Verified Runtime Versions
            </div>
            <dl className="grid grid-cols-2 gap-y-1.5 font-mono border-t border-rule pt-3">
              {Object.entries(meta.library_versions).map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-ink font-medium">{v}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>

          <div className="space-y-3">
            <div className="font-mono uppercase tracking-widest text-muted">
              Academic Integrity &amp; AI Disclosure
            </div>
            <p className="text-ink/85">
              This interactive notebook and companion FastAPI deployment were engineered with assistance from Google Antigravity. All experimental metrics, cross-validation splits, hyperparameter selections, and dataset statistics were computed solely by the study’s Python scripts and audited against <code className="font-mono">results_heart/</code>.
            </p>
            <p className="text-muted">
              Reference: {meta.paper.authors} ({meta.paper.year}), “{meta.paper.title}”, <em>{meta.paper.journal}</em> {meta.paper.volume}({meta.paper.issue}), pp. {meta.paper.pages}. Dataset: {meta.dataset.source}.
            </p>
            <div className="flex flex-wrap gap-4 pt-1 font-mono">
              <Link to="/workbench" className="inline-flex items-center gap-1 text-slate hover:underline">
                Data Workbench <ArrowUpRight size={12} />
              </Link>
              <Link to="/predict" className="inline-flex items-center gap-1 text-slate hover:underline">
                Consultation Sheet (/predict) <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
