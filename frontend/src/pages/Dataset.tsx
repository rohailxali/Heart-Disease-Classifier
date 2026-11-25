import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'
import { useData } from '../useData'
import { Card, Badge } from '../components/Card'
import { TableFallback } from '../components/TableFallback'

const FEATURE_METADATA = [
  { name: 'Age', type: 'Numeric', range: '28 – 77 yrs', meaning: 'Patient chronological age', pipeline: 'StandardScaler' },
  { name: 'Sex', type: 'Categorical', range: 'M (725), F (193)', meaning: 'Biological sex at birth', pipeline: 'OneHotEncoder' },
  { name: 'ChestPainType', type: 'Categorical', range: 'ASY (496), NAP (203), ATA (173), TA (46)', meaning: 'Angina category (TA, ATA, NAP, ASY)', pipeline: 'OneHotEncoder' },
  { name: 'RestingBP', type: 'Numeric', range: '0 – 200 mm Hg', meaning: 'Resting systolic blood pressure (1 row is 0)', pipeline: 'StandardScaler' },
  { name: 'Cholesterol', type: 'Numeric', range: '0 – 603 mg/dl', meaning: 'Serum cholesterol (172 rows are 0)', pipeline: 'StandardScaler' },
  { name: 'FastingBS', type: 'Binary', range: '0 (704), 1 (214)', meaning: 'Fasting blood sugar > 120 mg/dl', pipeline: 'Passthrough (0/1)' },
  { name: 'RestingECG', type: 'Categorical', range: 'Normal (552), LVH (188), ST (178)', meaning: 'Resting electrocardiographic results', pipeline: 'OneHotEncoder' },
  { name: 'MaxHR', type: 'Numeric', range: '60 – 202 bpm', meaning: 'Max heart rate achieved during exercise', pipeline: 'StandardScaler' },
  { name: 'ExerciseAngina', type: 'Binary', range: 'N (547), Y (371)', meaning: 'Exercise-induced angina symptom', pipeline: 'OneHotEncoder' },
  { name: 'Oldpeak', type: 'Numeric', range: '-2.6 – 6.2 mm', meaning: 'ST depression induced by exercise vs rest', pipeline: 'StandardScaler' },
  { name: 'ST_Slope', type: 'Categorical', range: 'Flat (460), Up (395), Down (63)', meaning: 'Peak exercise ST segment slope', pipeline: 'OneHotEncoder' },
  { name: 'HeartDisease', type: 'Target (Binary)', range: '0: Healthy (410), 1: Disease (508)', meaning: 'Presence of heart disease', pipeline: 'Target variable y' },
]

export default function Dataset() {
  const { data, loading, error } = useData()
  const [selectedNumFeature, setSelectedNumFeature] = useState('Age')
  const [selectedCatFeature, setSelectedCatFeature] = useState('ChestPainType')

  if (loading) return <div style={{ padding: 32, color: 'var(--muted)' }}>Loading dataset details...</div>
  if (error || !data) return <div style={{ padding: 32, color: '#FB7185' }}>Error: {error}</div>

  const { eda } = data

  // Class donut data
  const classDonutData = [
    { name: 'Disease (Class 1)', value: eda.class_counts.disease, color: '#FB7185' },
    { name: 'Healthy (Class 0)', value: eda.class_counts.healthy, color: '#2DD4BF' },
  ]
  const totalRows = eda.class_counts.disease + eda.class_counts.healthy

  // Numeric histogram data
  const currentHist = eda.num_histograms[selectedNumFeature]
  const histChartData = currentHist
    ? currentHist.healthy.map((hCount, idx) => {
        const binStart = currentHist.edges[idx]
        const binEnd = currentHist.edges[idx + 1]
        return {
          bin: `${binStart.toFixed(0)}-${binEnd.toFixed(0)}`,
          Healthy: hCount,
          Disease: currentHist.disease[idx] || 0,
        }
      })
    : []

  // Categorical stacked bar data
  const catObj = eda.cat_counts[selectedCatFeature] || {}
  const catChartData = Object.entries(catObj).map(([category, counts]) => ({
    category,
    Healthy: counts.healthy,
    Disease: counts.disease,
  }))

  // Cholesterol Before vs After zero removal
  const cholAllData = eda.data_quality.cholesterol_all_hist.healthy.map((h, i) => ({
    bin: `${eda.data_quality.cholesterol_all_hist.edges[i].toFixed(0)}-${eda.data_quality.cholesterol_all_hist.edges[i+1].toFixed(0)}`,
    Healthy: h,
    Disease: eda.data_quality.cholesterol_all_hist.disease[i] || 0,
  }))

  const cholNonzeroData = eda.data_quality.cholesterol_nonzero_hist.healthy.map((h, i) => ({
    bin: `${eda.data_quality.cholesterol_nonzero_hist.edges[i].toFixed(0)}-${eda.data_quality.cholesterol_nonzero_hist.edges[i+1].toFixed(0)}`,
    Healthy: h,
    Disease: eda.data_quality.cholesterol_nonzero_hist.disease[i] || 0,
  }))

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <Badge variant="info">Kaggle Heart Failure Prediction</Badge>
          <Badge variant="default">918 rows × 12 columns</Badge>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
          Dataset Characteristics & Quality Inspection
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, maxWidth: 840 }}>
          Distribution breakdown, clinical feature descriptions, correlation matrix, and prominent exposure of zero-coded missing values.
        </p>
      </motion.div>

      {/* Class Balance Donut & Quality Highlight */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: 28 }}>
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Target Class Balance</h3>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>HeartDisease distribution (508 Disease vs 410 Healthy)</p>
          <div style={{ height: 220, display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 190, height: 190, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={classDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={4}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {classDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: any, name: any) => [`${val} patients (${((Number(val)/totalRows)*100).toFixed(1)}%)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, paddingLeft: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#FB7185' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FB7185' }} />
                  Disease (Class 1)
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>
                  508 <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>(55.3%)</span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#2DD4BF' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2DD4BF' }} />
                  Healthy (Class 0)
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>
                  410 <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>(44.7%)</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Prominent Data Quality Callout */}
        <Card style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'var(--elevated)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={20} color="var(--amber)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Data Quality Alert: Hidden Missing Values Coded as 0
            </h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>
            While the raw CSV contains <b>0 standard NA/null values</b> and <b>0 duplicate rows</b>, physiological values of 0 indicate missing clinical measurements:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Cholesterol == 0</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>
                172 rows <span style={{ fontSize: 11, color: 'var(--muted)' }}>(18.7%)</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                Disease rate: <b style={{ color: '#FB7185' }}>88.4%</b> vs 47.7% otherwise
              </div>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>RestingBP == 0</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>
                1 row <span style={{ fontSize: 11, color: 'var(--muted)' }}>(0.1%)</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                Physiologically implausible record
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
            <b>Methodological impact:</b> The paper-faithful replication retains these rows as-is. Models (especially Tree-based and SVM) can easily leverage the zero spike as an artificial shortcut for disease detection.
          </div>
        </Card>
      </div>

      {/* Feature Distributions: Interactive Numeric Histograms & Categorical Stacked Bars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20, marginBottom: 28 }}>
        {/* Numeric Histogram */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Numeric Feature Distributions</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Class-conditioned histograms (20 bins)</p>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['Age', 'RestingBP', 'Cholesterol', 'MaxHR', 'Oldpeak'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedNumFeature(f)}
                  style={{
                    padding: '4px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: selectedNumFeature === f ? 'var(--teal)' : 'var(--border)',
                    background: selectedNumFeature === f ? 'rgba(45,212,191,0.15)' : 'transparent',
                    color: selectedNumFeature === f ? 'var(--teal)' : 'var(--muted)',
                    cursor: 'pointer',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={histChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="bin" stroke="var(--muted)" fontSize={10} angle={-30} textAnchor="end" interval={1} />
                <YAxis stroke="var(--muted)" fontSize={11} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: 12, bottom: -10 }} />
                <Bar dataKey="Healthy" fill="#2DD4BF" stackId="a" isAnimationActive={false} />
                <Bar dataKey="Disease" fill="#FB7185" stackId="a" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <TableFallback
            caption={`Histogram distribution for ${selectedNumFeature}`}
            headers={['Bin', 'Healthy Count', 'Disease Count']}
            rows={histChartData.map(d => [d.bin, d.Healthy, d.Disease])}
          />
        </Card>

        {/* Categorical Stacked Bar */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Categorical Feature Frequencies</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Class breakdown by category</p>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['ChestPainType', 'Sex', 'RestingECG', 'ExerciseAngina', 'ST_Slope', 'FastingBS'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedCatFeature(f)}
                  style={{
                    padding: '4px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: selectedCatFeature === f ? 'var(--teal)' : 'var(--border)',
                    background: selectedCatFeature === f ? 'rgba(45,212,191,0.15)' : 'transparent',
                    color: selectedCatFeature === f ? 'var(--teal)' : 'var(--muted)',
                    cursor: 'pointer',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={catChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="category" stroke="var(--muted)" fontSize={11} />
                <YAxis stroke="var(--muted)" fontSize={11} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Healthy" fill="#2DD4BF" isAnimationActive={false} />
                <Bar dataKey="Disease" fill="#FB7185" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <TableFallback
            caption={`Categorical breakdown for ${selectedCatFeature}`}
            headers={['Category', 'Healthy Count', 'Disease Count']}
            rows={catChartData.map(d => [d.category, d.Healthy, d.Disease])}
          />
        </Card>
      </div>

      {/* Cholesterol Distribution: All Rows vs Non-Zero Rows */}
      <Card style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          Cholesterol Distribution: Raw Zero Spike vs Filtered Physiology
        </h3>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          Comparison between the full dataset (left: massive spike at zero with 88.4% disease rate) vs non-zero physiological measurements (right).
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8, textAlign: 'center' }}>
              All 918 Rows (Includes 172 zero-coded missing values)
            </div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={cholAllData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="bin" stroke="var(--muted)" fontSize={9} interval={3} />
                  <YAxis stroke="var(--muted)" fontSize={10} />
                  <RechartsTooltip />
                  <Bar dataKey="Healthy" fill="#2DD4BF" stackId="c" isAnimationActive={false} />
                  <Bar dataKey="Disease" fill="#FB7185" stackId="c" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8, textAlign: 'center' }}>
              746 Non-Zero Rows Only (Physiological Distribution)
            </div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={cholNonzeroData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="bin" stroke="var(--muted)" fontSize={9} interval={3} />
                  <YAxis stroke="var(--muted)" fontSize={10} />
                  <RechartsTooltip />
                  <Bar dataKey="Healthy" fill="#2DD4BF" stackId="c" isAnimationActive={false} />
                  <Bar dataKey="Disease" fill="#FB7185" stackId="c" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </Card>

      {/* Interactive Correlation Heatmap */}
      <Card style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          Correlation Matrix (Numeric Features + HeartDisease)
        </h3>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          Pearson correlation coefficients. Hover on cells to inspect bivariate association with heart disease.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>Feature</th>
                {eda.corr_matrix.columns.map((c) => (
                  <th key={c} style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12, color: 'var(--text)' }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {eda.corr_matrix.columns.map((rowName, rIdx) => (
                <tr key={rowName}>
                  <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{rowName}</td>
                  {eda.corr_matrix.data[rIdx].map((val, cIdx) => {
                    // Color calculation based on correlation value (-1 to 1)
                    let bg = 'rgba(148,163,184,0.06)'
                    if (val > 0) {
                      bg = `rgba(251, 113, 133, ${Math.min(Math.abs(val) * 0.75 + 0.05, 0.85)})`
                    } else if (val < 0) {
                      bg = `rgba(45, 212, 191, ${Math.min(Math.abs(val) * 0.75 + 0.05, 0.85)})`
                    }
                    const isDiagonal = rIdx === cIdx
                    return (
                      <td
                        key={cIdx}
                        title={`${rowName} vs ${eda.corr_matrix.columns[cIdx]}: ${val.toFixed(4)}`}
                        style={{
                          padding: '10px 8px',
                          textAlign: 'center',
                          fontSize: 12,
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: isDiagonal ? 700 : 500,
                          background: bg,
                          color: Math.abs(val) > 0.45 ? '#FFFFFF' : 'var(--text)',
                          border: '1px solid var(--border)',
                          transition: 'transform 0.15s ease',
                          cursor: 'default',
                        }}
                      >
                        {val.toFixed(2)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Feature Metadata Table */}
      <Card>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          Feature Dictionary & Pipeline Transformation
        </h3>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          Standardized treatment across scikit-learn and Keras pipelines
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>Feature</th>
                <th style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>Type</th>
                <th style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>Value Range / Categories</th>
                <th style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>Clinical Meaning</th>
                <th style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>Preprocessing</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_METADATA.map((f) => (
                <tr key={f.name} style={{ borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text)' }}>{f.name}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge variant={f.type.startsWith('Numeric') ? 'info' : f.type.startsWith('Target') ? 'warning' : 'default'}>
                      {f.type}
                    </Badge>
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--muted)' }}>
                    {f.range}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{f.meaning}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--teal)', fontFamily: 'JetBrains Mono', fontSize: 12 }}>
                    {f.pipeline}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
