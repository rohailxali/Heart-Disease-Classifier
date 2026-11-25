import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Layers, Shuffle, Users, ArrowRight,
  Activity, AlertTriangle
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import { useData } from '../useData'
import { Card, Badge } from '../components/Card'
import { SegmentedControl } from '../components/SegmentedControl'
import { TableFallback } from '../components/TableFallback'
import { MODEL_LABELS } from '../utils'

export default function Overview() {
  const { data, loading, error } = useData()
  const [yAxisScale, setYAxisScale] = useState<'focused' | 'full'>('focused')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-muted">
        Loading replication data...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8 text-rose-400">
        <h3 className="font-bold">Error loading replication data</h3>
        <p>{error}</p>
      </div>
    )
  }

  const { meta, comparison } = data

  const accuracyComp = comparison.filter(c => c.metric === 'accuracy')

  // Prepare mini comparison chart data
  const miniChartData = accuracyComp.map(c => ({
    model: c.model,
    fullName: MODEL_LABELS[c.model] || c.model,
    paper: Number((c.paper * 100).toFixed(1)),
    mine: Number((c.mine * 100).toFixed(1)),
    std: Number((c.std * 100).toFixed(2)),
  }))

  const containerAnimation = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  }

  const itemAnimation = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  }

  return (
    <div className="max-w-[1240px] mx-auto px-5 py-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8"
      >
        <div className="flex gap-2 items-center mb-3">
          <Badge variant="info">University ML Lab Replication</Badge>
          <Badge variant="default">JAIC 9(6), 2025</Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text mb-2.5">
          {meta.paper.title}
        </h1>
        <p className="text-sm sm:text-base text-muted max-w-3xl leading-relaxed">
          An autonomous verification and comparative study replicating machine learning and deep learning pipelines on the Kaggle Heart Failure dataset across 5 stratified random seeds, evaluating generalization stability beyond the paper's single-split report.
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={containerAnimation}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-7"
      >
        <motion.div variants={itemAnimation}>
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted font-medium">Models Replicated</span>
              <Layers size={18} className="text-teal" />
            </div>
            <div className="text-3xl font-extrabold text-text font-mono">
              6
            </div>
            <div className="text-xs text-muted mt-1">
              NB, DT, RF, SVM, LR, DNN
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemAnimation}>
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted font-medium">Random Seeds Evaluated</span>
              <Shuffle size={18} className="text-amber" />
            </div>
            <div className="text-3xl font-extrabold text-text font-mono">
              5
            </div>
            <div className="text-xs text-muted mt-1">
              Seeds 42, 43, 44, 45, 46 (stratified 80:20)
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemAnimation}>
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted font-medium">Test Patients / Seed</span>
              <Users size={18} className="text-slateBlue" />
            </div>
            <div className="text-3xl font-extrabold text-text font-mono">
              184
            </div>
            <div className="text-xs text-muted mt-1">
              102 disease, 82 healthy (~0.54% per patient)
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Grid: Comparison Chart + Deep-dive Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-7">
        {/* Comparison Mini Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text">Paper vs. Replication (Accuracy %)</h3>
                <Badge variant={yAxisScale === 'focused' ? 'warning' : 'default'}>
                  {yAxisScale === 'focused' ? 'Y-axis starts at 70%' : 'Y-axis starts at 0%'}
                </Badge>
              </div>
              <p className="text-xs text-muted mt-0.5">Mean replication accuracy across 5 seeds vs paper's single-split report</p>
            </div>
            <div className="flex items-center gap-3">
              <SegmentedControl
                options={[
                  { value: 'focused', label: '70%–100%' },
                  { value: 'full', label: '0%–100%' },
                ]}
                value={yAxisScale}
                onChange={(v) => setYAxisScale(v as 'focused' | 'full')}
                size="sm"
              />
              <Link to="/comparison" className="text-xs text-teal hover:underline flex items-center gap-1 font-medium">
                Full report <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={miniChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="model" stroke="var(--muted)" fontSize={12} tickLine={false} />
                <YAxis
                  domain={yAxisScale === 'focused' ? [70, 100] : [0, 100]}
                  stroke="var(--muted)"
                  fontSize={11}
                  tickFormatter={(v) => `${v}%`}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="bg-surface border border-border p-2.5 rounded-lg text-xs shadow-lg">
                          <div className="font-bold text-text mb-1">{d.fullName} ({d.model})</div>
                          <div className="text-blue-300">Paper: <b>{d.paper}%</b></div>
                          <div className="text-amber">Replication: <b>{d.mine}% ± {d.std}%</b></div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value) => value === 'paper' ? 'Paper (single run)' : 'Replication (mean, 5 seeds)'}
                />
                <Bar dataKey="paper" name="paper" fill="#7FA6D6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="mine" name="mine" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <TableFallback
            caption="Comparison of paper accuracy vs replication accuracy"
            headers={['Model', 'Paper Accuracy (%)', 'Replication Mean Accuracy (%)']}
            rows={miniChartData.map(d => [d.model, d.paper, d.mine])}
          />
        </Card>

        {/* Feature Cards Linking to Findings & Predict */}
        <div className="flex flex-col gap-4">
          <Link to="/findings" className="block flex-1 group">
            <Card className="h-full flex flex-col justify-between border-amber/30 group-hover:border-amber/60 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <Badge variant="warning">Methodology Finding</Badge>
                  <AlertTriangle size={18} className="text-amber" />
                </div>
                <h4 className="text-base font-bold text-text mb-1.5">
                  Zero-Coded Cholesterol Missingness
                </h4>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  172 patients (18.7%) have Cholesterol = 0, which strongly biases models toward predicting disease (88.4% disease rate vs 47.7% in non-zero cohort).
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-amber font-semibold mt-3">
                Explore all findings & limitations <ArrowRight size={14} />
              </div>
            </Card>
          </Link>

          <Link to="/predict" className="block flex-1 group">
            <Card className="h-full flex flex-col justify-between border-teal/30 group-hover:border-teal/60 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <Badge variant="info">Interactive System</Badge>
                  <Activity size={18} className="text-teal" />
                </div>
                <h4 className="text-base font-bold text-text mb-1.5">
                  Live Heart Disease Predictor
                </h4>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  Input patient attributes or test against randomly selected held-out test patients from the seed-42 split to view multi-model consensus and ensemble probabilities.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-teal font-semibold mt-3">
                Open live predictor <ArrowRight size={14} />
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
