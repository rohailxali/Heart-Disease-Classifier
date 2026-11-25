// App shell: sidebar navigation + top bar
import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, Database, GitBranch, BarChart3,
  BookOpen, FlaskConical, Activity, Lightbulb,
  Sun, Moon, Menu, X, ChevronRight,
} from 'lucide-react'
import { ThemeProvider } from './ThemeContext'
import { useTheme } from './useTheme'
import Overview from './pages/Overview'
import Dataset from './pages/Dataset'
import Pipeline from './pages/Pipeline'
import Results from './pages/Results'
import Comparison from './pages/Comparison'
import Findings from './pages/Findings'
import Predict from './pages/Predict'
import Experiments from './pages/Experiments'

const BASE_NAV = [
  { to: '/',           label: 'Overview',       icon: LayoutDashboard },
  { to: '/dataset',    label: 'Dataset',         icon: Database        },
  { to: '/pipeline',   label: 'Pipeline',        icon: GitBranch       },
  { to: '/results',    label: 'Results',         icon: BarChart3       },
  { to: '/comparison', label: 'Paper vs Rep.',   icon: BookOpen        },
  { to: '/predict',    label: 'Predict',         icon: Activity        },
  { to: '/findings',   label: 'Findings',        icon: Lightbulb       },
]

function TopBar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { theme, toggle } = useTheme()
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 20px', height: 56,
    }}>
      <button
        onClick={onToggle}
        aria-label="Toggle sidebar"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--muted)', padding: 6, borderRadius: 8,
          display: 'flex', alignItems: 'center',
        }}
      >
        {collapsed ? <Menu size={20} /> : <X size={20} />}
      </button>
      <span style={{ flex: 1 }} />
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
        Heart Disease ML Replication
      </span>
      <button
        onClick={toggle}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        style={{
          background: 'none', border: '1px solid var(--border)',
          cursor: 'pointer', color: 'var(--muted)', padding: '6px 10px',
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 13,
        }}
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>
    </header>
  )
}

function Sidebar({ collapsed, navItems }: { collapsed: boolean; navItems: typeof BASE_NAV }) {
  const location = useLocation()
  return (
    <motion.aside
      animate={{ width: collapsed ? 0 : 220 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{
        overflow: 'hidden', flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        height: '100%',
      }}
    >
      <div style={{ width: 220, padding: '16px 0', height: '100%', overflowY: 'auto' }}>
        {/* Logo */}
        <div style={{ padding: '8px 20px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <FlaskConical size={22} color="#2DD4BF" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
              ML Lab
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Heart Disease Study</div>
          </div>
        </div>

        <nav aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 20px', fontSize: 13.5, fontWeight: 500,
                  color: isActive ? '#2DD4BF' : 'var(--muted)',
                  background: isActive ? 'rgba(45,212,191,.08)' : 'transparent',
                  borderRight: isActive ? '2px solid #2DD4BF' : '2px solid transparent',
                  textDecoration: 'none', transition: 'all 150ms',
                }}
              >
                <Icon size={16} />
                {label}
                {isActive && (
                  <motion.span layoutId="navPill" style={{ marginLeft: 'auto' }}>
                    <ChevronRight size={14} />
                  </motion.span>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </motion.aside>
  )
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        style={{ flex: 1, overflow: 'auto', height: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

function Shell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobile, setMobile] = useState(window.innerWidth < 768)
  const [hasVariants, setHasVariants] = useState(false)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/variants.json`)
      .then(res => { if (res.ok) setHasVariants(true) })
      .catch(() => {})
  }, [])

  const navItems = hasVariants
    ? [...BASE_NAV, { to: '/experiments', label: 'Experiments', icon: FlaskConical }]
    : BASE_NAV

  useEffect(() => {
    const fn = () => {
      const isMobile = window.innerWidth < 768
      setMobile(isMobile)
      if (isMobile) setCollapsed(true)
    }
    window.addEventListener('resize', fn)
    fn()
    return () => window.removeEventListener('resize', fn)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <TopBar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {!mobile && <Sidebar collapsed={collapsed} navItems={navItems} />}
        <main style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          <PageTransition>
            <Routes>
              <Route path="/"            element={<Overview />} />
              <Route path="/dataset"     element={<Dataset />} />
              <Route path="/pipeline"    element={<Pipeline />} />
              <Route path="/results"     element={<Results />} />
              <Route path="/comparison"  element={<Comparison />} />
              <Route path="/predict"     element={<Predict />} />
              <Route path="/findings"    element={<Findings />} />
              {hasVariants && <Route path="/experiments" element={<Experiments />} />}
            </Routes>
          </PageTransition>
        </main>
      </div>
      {/* Mobile bottom nav */}
      {mobile && (
        <nav
          aria-label="Mobile navigation"
          style={{
            display: 'flex', borderTop: '1px solid var(--border)',
            background: 'var(--surface)',
          }}
        >
          {navItems.slice(0, 5).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', padding: '8px 4px',
                color: isActive ? '#2DD4BF' : 'var(--muted)',
                textDecoration: 'none', fontSize: 10, gap: 3,
              })}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </ThemeProvider>
  )
}
