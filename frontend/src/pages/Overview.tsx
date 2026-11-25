import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Layers, Shuffle, Users, Award, ArrowRight,
  ShieldCheck, Activity, AlertTriangle
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import { useData } from '../useData'
import { Card, Badge } from '../components/Card'
import { TableFallback } from '../components/TableFallback'
import { fmtPct, fmtAUC, MODEL_LABELS } from '../utils'

export default function Overview() {
  const { data, loading, error } = useData()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--muted)' }}>
        Loading replication data...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ padding: '32px', color: '#FB7185' }}>
        <h3>Error loading replication data</h3>
        <p>{error}</p>
      </div>
    )
  }

  const { meta, results, comparison } = data

  // Find best model by mean accuracy
  let bestModel = 'SVM'
  let bestAcc = 0
  Object.entries(results).forEach(([model, res]) => {
    const acc = res.stats.accuracy?.mean ?? 0
    if (acc > bestAcc) {
      bestAcc = acc
      bestModel = model
    }
  })

  // Compute verdict count: models matching within 1 standard deviation
  const accuracyComp = comparison.filter(c => c.metric === 'accuracy')
  const withinNoiseCount = accuracyComp.filter(c => c.verdict === 'within noise').length
  const totalModels = accuracyComp.length

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
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ marginBottom: 32 }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <Badge variant="info">University ML Lab Replication</Badge>
          <Badge variant="default">JAIC 9(6), 2025</Badge>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.25, color: 'var(--text)', marginBottom: 10 }}>
          {meta.paper.title}
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--muted)', maxWidth: 880, lineHeight: 1.6 }}>
          An autonomous verification and comparative study replicating machine learning and deep learning pipelines on the Kaggle Heart Failure dataset across 5 stratified random seeds, evaluating generalization stability beyond the paper's single-split report.
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={containerAnimation}
        initial="hidden"
        animate="show"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <motion.div variants={itemAnimation}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Models Replicated</span>
              <Layers size={18} color="var(--teal)" />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
              6
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              NB, DT, RF, SVM, LR, DNN
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemAnimation}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Random Seeds Evaluated</span>
              <Shuffle size={18} color="var(--amber)" />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
              5
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Seeds 42, 43, 44, 45, 46 (stratified 80:20)
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemAnimation}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Test Patients / Seed</span>
              <Users size={18} color="var(--slate-blue)" />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
              184
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              102 disease, 82 healthy (~0.54% per patient)
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemAnimation}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Top Performing Model</span>
              <Award size={18} color="#34D399" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
                {bestModel}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#34D399', fontFamily: 'JetBrains Mono, monospace' }}>
                {fmtPct(bestAcc)}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              AUC: {fmtAUC(results[bestModel]?.stats.auc?.mean ?? 0)} ± {fmtAUC(results[bestModel]?.stats.auc?.std ?? 0)}
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Computed Verdict Sentence Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        style={{ marginBottom: 28 }}
      >
        <Card style={{ background: 'var(--elevated)', borderLeft: '4px solid var(--teal)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <ShieldCheck size={24} color="var(--teal)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                Replication Verdict: {withinNoiseCount} of {totalModels} models match the paper within 1 standard deviation
              </div>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                Naïve Bayes, Random Forest, and Logistic Regression replicated within noise bounds (|diff| ≤ 1 SD). Decision Tree replicated significantly higher (+4.4 pp accuracy, +10.0 pp AUC), while the DNN demonstrated higher variance across seeds due to absence of early stopping.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Mini Comparison Chart & Quick Navigation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, marginBottom: 32 }}>
        {/* Compact Mini Chart */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Paper vs. Replication (Accuracy %)</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 0' }}>Mean replication accuracy across 5 seeds vs paper's single-split report</p>
            </div>
            <Link to="/comparison" style={{ fontSize: 12, color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              Full report <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={miniChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="model" stroke="var(--muted)" fontSize={12} tickLine={false} />
                <YAxis domain={[70, 100]} stroke="var(--muted)" fontSize={11} tickFormatter={(v) => `${v}%`} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{d.fullName} ({d.model})</div>
                          <div style={{ color: '#7FA6D6' }}>Paper: <b>{d.paper}%</b></div>
                          <div style={{ color: '#F59E0B' }}>Replication: <b>{d.mine}% ± {d.std}%</b></div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Link to="/findings" style={{ textDecoration: 'none', flex: 1 }}>
            <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(245,158,11,0.25)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Badge variant="warning">Methodology Finding</Badge>
                  <AlertTriangle size={18} color="var(--amber)" />
                </div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Zero-Coded Cholesterol Missingness
                </h4>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                  172 patients (18.7%) have Cholesterol = 0, which strongly biases models toward predicting disease (88.4% disease rate vs 47.7% in non-zero cohort).
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--amber)', fontWeight: 600, marginTop: 12 }}>
                Explore all findings & limitations <ArrowRight size={14} />
              </div>
            </Card>
          </Link>

          <Link to="/predict" style={{ textDecoration: 'none', flex: 1 }}>
            <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(45,212,191,0.25)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Badge variant="info">Interactive System</Badge>
                  <Activity size={18} color="var(--teal)" />
                </div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Live Heart Disease Predictor
                </h4>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                  Input patient attributes or test against randomly selected held-out test patients from the seed-42 split to view multi-model consensus and ensemble probabilities.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--teal)', fontWeight: 600, marginTop: 12 }}>
                Open live predictor <ArrowRight size={14} />
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
