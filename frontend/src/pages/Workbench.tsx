import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Copy, Download } from 'lucide-react'
import { useData } from '../useData'
import {
  MODELS, SEEDS, MODEL_LABELS, METRIC_LABELS,
  fmtPct, fmtAUC, fmtZ,
} from '../utils'
import type { CompRow } from '../schemas'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { SegmentedControl } from '../components/SegmentedControl'
import { DataTable, type Column } from '../components/DataTable'

interface LeaderboardRow {
  model: string
  accMean: number
  accStd: number
  aucMean: number
  aucStd: number
  cvMean: number | null
  cvStd: number | null
  prec1Mean: number
  rec1Mean: number
  f11Mean: number
}

export default function Workbench() {
  const { data, loading, error } = useData()
  const [compModelFilter, setCompModelFilter] = useState<string>('ALL')
  const [compMetricFilter, setCompMetricFilter] = useState<string>('ALL')
  const [copiedMd, setCopiedMd] = useState(false)

  const [cmModel, setCmModel] = useState<string>('SVM')
  const [cmSeedChoice, setCmSeedChoice] = useState<string>('pooled')

  const leaderboardRows: LeaderboardRow[] = useMemo(() => {
    if (!data) return []
    return MODELS.map(m => {
      const s = data.results[m].stats
      return {
        model: m,
        accMean: s.accuracy.mean ?? 0,
        accStd: s.accuracy.std ?? 0,
        aucMean: s.auc.mean ?? 0,
        aucStd: s.auc.std ?? 0,
        cvMean: s.cv_acc.mean,
        cvStd: s.cv_acc.std,
        prec1Mean: s.precision1.mean ?? 0,
        rec1Mean: s.recall1.mean ?? 0,
        f11Mean: s.f1_1.mean ?? 0,
      }
    }).sort((a, b) => b.accMean - a.accMean)
  }, [data])

  const filteredComp = useMemo(() => {
    if (!data) return []
    return data.comparison.filter(r => {
      if (compModelFilter !== 'ALL' && r.model !== compModelFilter) return false
      if (compMetricFilter !== 'ALL' && r.metric !== compMetricFilter) return false
      return true
    })
  }, [data, compModelFilter, compMetricFilter])

  const activeCm = useMemo(() => {
    if (!data) return null
    const mod = data.results[cmModel]
    if (cmSeedChoice === 'pooled') return { label: 'Pooled (5 seeds × 184 = 920 evals)', ...mod.confusion_pooled }
    const seedNum = Number(cmSeedChoice)
    const found = mod.confusion_per_seed.find(s => s.seed === seedNum) ?? mod.confusion_per_seed[0]
    return { label: `Seed ${found.seed} (184 held-out test patients)`, ...found }
  }, [data, cmModel, cmSeedChoice])

  if (loading) {
    return (
      <div className="notebook-wide py-20 text-sm font-mono text-muted">
        Loading benchmark tables…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="notebook-wide py-20 text-sm font-mono text-oxblood">
        Failed to load data: {error || 'Unknown error'}
      </div>
    )
  }

  const leaderboardCols: Column<LeaderboardRow>[] = [
    {
      key: 'model',
      header: 'Model',
      sortable: true,
      sortValue: r => r.model,
      render: r => (
        <div>
          <span className="font-mono font-semibold text-ink">{r.model}</span>
          <span className="block text-xs text-muted">{MODEL_LABELS[r.model]}</span>
        </div>
      ),
    },
    {
      key: 'accMean',
      header: 'Accuracy (5 seeds)',
      align: 'right',
      sortable: true,
      sortValue: r => r.accMean,
      render: r => (
        <span className="font-mono text-ink font-medium">
          {fmtPct(r.accMean, 2)} <span className="text-muted text-xs">± {(r.accStd * 100).toFixed(2)}</span>
        </span>
      ),
    },
    {
      key: 'aucMean',
      header: 'ROC-AUC',
      align: 'right',
      sortable: true,
      sortValue: r => r.aucMean,
      render: r => (
        <span className="font-mono text-ink">
          {fmtAUC(r.aucMean)} <span className="text-muted text-xs">± {r.aucStd.toFixed(4)}</span>
        </span>
      ),
    },
    {
      key: 'cvMean',
      header: '5-Fold CV Acc',
      align: 'right',
      sortable: true,
      sortValue: r => r.cvMean ?? -1,
      render: r => (
        <span className="font-mono text-muted">
          {r.cvMean !== null ? fmtPct(r.cvMean, 2) : '20% val split'}
        </span>
      ),
    },
    {
      key: 'prec1Mean',
      header: 'Prec (Disease)',
      align: 'right',
      sortable: true,
      sortValue: r => r.prec1Mean,
      render: r => <span className="font-mono">{fmtPct(r.prec1Mean, 1)}</span>,
    },
    {
      key: 'rec1Mean',
      header: 'Rec (Disease)',
      align: 'right',
      sortable: true,
      sortValue: r => r.rec1Mean,
      render: r => <span className="font-mono">{fmtPct(r.rec1Mean, 1)}</span>,
    },
    {
      key: 'f11Mean',
      header: 'F1 (Disease)',
      align: 'right',
      sortable: true,
      sortValue: r => r.f11Mean,
      render: r => <span className="font-mono">{fmtPct(r.f11Mean, 1)}</span>,
    },
  ]

  const compCols: Column<CompRow>[] = [
    {
      key: 'model',
      header: 'Model',
      sortable: true,
      sortValue: r => r.model,
      render: r => <span className="font-mono font-semibold text-ink">{r.model}</span>,
    },
    {
      key: 'metric',
      header: 'Metric',
      sortable: true,
      sortValue: r => r.metric,
      render: r => <span className="text-xs text-ink">{METRIC_LABELS[r.metric] || r.metric}</span>,
    },
    {
      key: 'paper',
      header: 'Paper (single run)',
      align: 'right',
      sortable: true,
      sortValue: r => r.paper,
      render: r => (
        <span className="font-mono text-slate">
          {r.metric === 'auc' ? r.paper.toFixed(2) : `${(r.paper * 100).toFixed(1)}%`}
        </span>
      ),
    },
    {
      key: 'mine',
      header: 'Ours (5-seed mean ± SD)',
      align: 'right',
      sortable: true,
      sortValue: r => r.mine,
      render: r => (
        <span className="font-mono text-ink font-medium">
          {r.metric === 'auc'
            ? `${r.mine.toFixed(3)} ± ${r.std.toFixed(3)}`
            : `${(r.mine * 100).toFixed(1)}% ± ${(r.std * 100).toFixed(1)}`}
        </span>
      ),
    },
    {
      key: 'diff',
      header: 'Diff (pp)',
      align: 'right',
      sortable: true,
      sortValue: r => r.diff,
      render: r => (
        <span className="font-mono text-xs text-ink">
          {r.diff > 0 ? '+' : ''}{(r.diff * 100).toFixed(2)} pp
        </span>
      ),
    },
    {
      key: 'z',
      header: 'Z-score',
      align: 'right',
      sortable: true,
      sortValue: r => r.z ?? 0,
      render: r => <span className="font-mono text-xs text-muted">{fmtZ(r.z)}</span>,
    },
    {
      key: 'verdict',
      header: 'Verdict',
      align: 'center',
      sortable: true,
      sortValue: r => r.verdict,
      render: r => (
        <Chip
          variant={
            r.verdict === 'higher' ? 'healthy' : r.verdict === 'lower' ? 'disease' : 'neutral'
          }
          dot
        >
          {r.verdict}
        </Chip>
      ),
    },
  ]

  const copyMarkdown = async () => {
    const header = '| Model | Metric | Paper (single run) | Replication Mean ± SD | Diff (pp) | Z-score | Verdict |\n| --- | --- | ---: | ---: | ---: | ---: | :--- |'
    const lines = filteredComp.map(r => {
      const pStr = r.metric === 'auc' ? r.paper.toFixed(2) : `${(r.paper * 100).toFixed(1)}%`
      const mStr = r.metric === 'auc'
        ? `${r.mine.toFixed(3)} ± ${r.std.toFixed(3)}`
        : `${(r.mine * 100).toFixed(1)}% ± ${(r.std * 100).toFixed(1)}`
      const diffStr = `${r.diff > 0 ? '+' : ''}${(r.diff * 100).toFixed(2)}`
      return `| ${r.model} | ${METRIC_LABELS[r.metric] || r.metric} | ${pStr} | ${mStr} | ${diffStr} | ${fmtZ(r.z)} | ${r.verdict} |`
    })
    try {
      await navigator.clipboard.writeText(`${header}\n${lines.join('\n')}`)
      setCopiedMd(true)
      setTimeout(() => setCopiedMd(false), 2200)
    } catch {
      setCopiedMd(false)
    }
  }

  const downloadCsv = () => {
    const headers = ['model', 'metric', 'paper_single_run', 'replication_mean', 'replication_std', 'diff', 'z_score', 'verdict']
    const csvRows = [
      headers.join(','),
      ...filteredComp.map(r =>
        [
          r.model,
          r.metric,
          r.paper,
          r.mine,
          r.std,
          r.diff,
          r.z ?? '',
          `"${r.verdict.replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'heart_disease_comparison.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const cmTotal = activeCm ? activeCm.TN + activeCm.FP + activeCm.FN + activeCm.TP : 0
  const cmAcc = activeCm && cmTotal > 0 ? (activeCm.TN + activeCm.TP) / cmTotal : 0
  const cmSens = activeCm && (activeCm.TP + activeCm.FN) > 0 ? activeCm.TP / (activeCm.TP + activeCm.FN) : 0
  const cmSpec = activeCm && (activeCm.TN + activeCm.FP) > 0 ? activeCm.TN / (activeCm.TN + activeCm.FP) : 0

  return (
    <div className="notebook-wide py-10 sm:py-14 space-y-16">
      {/* Header */}
      <header className="border-b border-rule pb-6">
        <div className="mb-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={14} />
              Return to Narrative Notebook
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted mb-1">
              Data Workbench
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">
              Benchmarks, Comparisons &amp; Hyperparameters
            </h1>
            <p className="text-sm text-muted mt-2 max-w-2xl">
              Every figure in this workbench is loaded directly from the audited JSON contracts. All replication scores report mean ± SD over seeds 42–46; paper numbers denote reported single runs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip variant="replication" dot>5-Seed Mean ± SD</Chip>
            <Chip variant="paper" dot>Paper: Single Run</Chip>
          </div>
        </div>
      </header>

      {/* 1. Leaderboard */}
      <section aria-labelledby="wb-leaderboard">
        <div className="mb-4">
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted">Table 1</div>
          <h2 id="wb-leaderboard" className="font-display text-2xl font-bold text-ink">
            Model Performance Leaderboard
          </h2>
        </div>

        <DataTable
          caption="Replication performance sorted across all 6 architectures (mean ± SD over seeds 42–46; 184 test patients per seed)."
          columns={leaderboardCols}
          data={leaderboardRows}
          keyField="model"
          defaultSortKey="accMean"
          defaultSortDir="desc"
        />
      </section>

      {/* 2. Paper vs Replication Comparison Matrix */}
      <section aria-labelledby="wb-comparison">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted">Table 2</div>
            <h2 id="wb-comparison" className="font-display text-2xl font-bold text-ink">
              Paper vs Replication ({filteredComp.length} of {data.comparison.length} rows)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="wb-model-filter" className="sr-only">Filter by model</label>
            <select
              id="wb-model-filter"
              value={compModelFilter}
              onChange={e => setCompModelFilter(e.target.value)}
              className="text-xs font-mono border border-rule bg-surface text-ink rounded-[2px] px-2.5 py-1.5"
            >
              <option value="ALL">All Models (6)</option>
              {MODELS.map(m => <option key={m} value={m}>{m} ({MODEL_LABELS[m]})</option>)}
            </select>

            <label htmlFor="wb-metric-filter" className="sr-only">Filter by metric</label>
            <select
              id="wb-metric-filter"
              value={compMetricFilter}
              onChange={e => setCompMetricFilter(e.target.value)}
              className="text-xs font-mono border border-rule bg-surface text-ink rounded-[2px] px-2.5 py-1.5"
            >
              <option value="ALL">All Metrics (8)</option>
              {Object.entries(METRIC_LABELS)
                .filter(([k]) => k !== 'cv_acc')
                .map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}
            </select>

            <Button variant="secondary" size="sm" onClick={copyMarkdown}>
              {copiedMd ? <Check size={13} className="text-green" /> : <Copy size={13} />}
              <span>{copiedMd ? `Copied ${filteredComp.length} rows` : 'Copy as Markdown'}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCsv}>
              <Download size={13} />
              <span>Download CSV</span>
            </Button>
          </div>
        </div>

        <DataTable
          caption="Metric-by-model deviation between Simanjuntak et al. (2025, single run) and our 5-seed replication."
          columns={compCols}
          data={filteredComp}
          keyField={r => `${r.model}-${r.metric}`}
        />
      </section>

      {/* 3. Hyperparameter Stability */}
      <section aria-labelledby="wb-params">
        <div className="mb-4">
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted">Table 3</div>
          <h2 id="wb-params" className="font-display text-2xl font-bold text-ink">
            Best Hyperparameters Selected Per Seed
          </h2>
          <p className="text-sm text-muted mt-1">
            GridSearchCV (5-fold) winning configurations across seeds 42–46; DNN configurations selected on a 20% validation split.
          </p>
        </div>

        <div className="w-full overflow-x-auto border-t border-b border-rule bg-surface">
          <table className="w-full text-left text-sm border-collapse">
            <caption className="text-left px-4 py-2.5 text-xs marginalia border-b border-rule/70">
              Selected hyperparameter strings per seed (42–46) for each architecture.
            </caption>
            <thead>
              <tr className="border-b border-rule text-[11px] font-mono text-muted uppercase tracking-wider">
                <th scope="col" className="py-2.5 px-3.5">Model</th>
                {SEEDS.map(s => (
                  <th key={s} scope="col" className="py-2.5 px-3.5">Seed {s}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule/50">
              {MODELS.map(m => {
                const seedEntries = data.params[m] || []
                return (
                  <tr key={m} className="hover:bg-ink/[0.03]">
                    <td className="py-3 px-3.5 font-mono font-semibold text-ink whitespace-nowrap">
                      {m}
                      <span className="block text-[11px] font-sans font-normal text-muted">
                        {MODEL_LABELS[m]}
                      </span>
                    </td>
                    {SEEDS.map(s => {
                      const row = seedEntries.find(e => e.seed === s)
                      const paramPairs = row
                        ? Object.entries(row).filter(([k]) => k !== 'seed' && k !== 'model')
                        : []
                      return (
                        <td key={s} className="py-3 px-3.5 font-mono text-xs text-ink align-top">
                          {paramPairs.length > 0 ? (
                            paramPairs.map(([k, v]) => (
                              <div key={k} className="whitespace-nowrap">
                                <span className="text-muted">{k}:</span> {String(v)}
                              </div>
                            ))
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Confusion Matrix Inspector */}
      <section aria-labelledby="wb-confusion">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted">Panel 4</div>
            <h2 id="wb-confusion" className="font-display text-2xl font-bold text-ink">
              Confusion Matrix Inspector
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              size="sm"
              name="wb-cm-model"
              ariaLabel="Confusion model selector"
              value={cmModel}
              onChange={setCmModel}
              options={MODELS.map(m => ({ value: m, label: m }))}
            />
            <SegmentedControl
              size="sm"
              name="wb-cm-seed"
              ariaLabel="Confusion seed selector"
              value={cmSeedChoice}
              onChange={v => setCmSeedChoice(String(v))}
              options={[
                { value: 'pooled', label: 'Pooled (920)' },
                ...SEEDS.map(s => ({ value: String(s), label: `${s}` })),
              ]}
            />
          </div>
        </div>

        {activeCm && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-b border-rule py-6 bg-surface px-4 sm:px-6">
            <div className="lg:col-span-7 overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <caption className="text-left pb-3 text-xs font-mono text-muted">
                  {MODEL_LABELS[cmModel]} ({cmModel}) — {activeCm.label}
                </caption>
                <thead>
                  <tr className="border-b border-rule text-[11px] font-mono text-muted uppercase">
                    <th scope="col" className="py-2 px-3 text-left">Actual \ Predicted</th>
                    <th scope="col" className="py-2 px-3 text-green">Pred Healthy (0)</th>
                    <th scope="col" className="py-2 px-3 text-oxblood">Pred Disease (1)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/50 font-mono">
                  <tr>
                    <th scope="row" className="py-4 px-3 text-left text-xs uppercase text-muted font-medium">
                      Actual Healthy (0)
                    </th>
                    <td className="py-4 px-3 border-r border-rule/50">
                      <span className="block text-2xl font-bold text-green">{activeCm.TN}</span>
                      <span className="text-[11px] text-muted">True Negative</span>
                    </td>
                    <td className="py-4 px-3">
                      <span className="block text-2xl font-bold text-ochreInk">{activeCm.FP}</span>
                      <span className="text-[11px] text-muted">False Positive</span>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-4 px-3 text-left text-xs uppercase text-muted font-medium">
                      Actual Disease (1)
                    </th>
                    <td className="py-4 px-3 border-r border-rule/50">
                      <span className="block text-2xl font-bold text-oxblood">{activeCm.FN}</span>
                      <span className="text-[11px] text-muted">False Negative</span>
                    </td>
                    <td className="py-4 px-3">
                      <span className="block text-2xl font-bold text-oxblood">{activeCm.TP}</span>
                      <span className="text-[11px] text-muted">True Positive</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="lg:col-span-5 lg:border-l border-rule lg:pl-6 flex flex-col justify-center space-y-4">
              <div className="font-mono text-[11px] uppercase tracking-widest text-muted">
                Derived Clinical Rates
              </div>
              <div className="grid grid-cols-3 gap-4 border-b border-rule/70 pb-4">
                <div>
                  <div className="text-xs text-muted">Accuracy</div>
                  <div className="numeral text-2xl text-ink mt-0.5">{fmtPct(cmAcc, 1)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Sensitivity</div>
                  <div className="numeral text-2xl text-oxblood mt-0.5">{fmtPct(cmSens, 1)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Specificity</div>
                  <div className="numeral text-2xl text-green mt-0.5">{fmtPct(cmSpec, 1)}</div>
                </div>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Pooled totals sum all 5 non-independent test splits (5 × 184 = 920 patient evaluations). Individual seeds inspect strict held-out test folds without overlap.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
