// App shell: sidebar navigation + top bar + accessible routing
import React, { useState, useEffect, Suspense, lazy } from 'react'
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, Database, GitBranch, BarChart3,
  BookOpen, FlaskConical, Activity, Lightbulb,
  Sun, Moon, PanelLeftClose, PanelLeftOpen, ChevronRight, Loader2
} from 'lucide-react'
import { ThemeProvider } from './ThemeContext'
import { useTheme } from './useTheme'
import { ErrorBoundary } from './components/ErrorBoundary'

// Lazy-load all routes for bundle optimization
const Overview = lazy(() => import('./pages/Overview'))
const Dataset = lazy(() => import('./pages/Dataset'))
const Pipeline = lazy(() => import('./pages/Pipeline'))
const Results = lazy(() => import('./pages/Results'))
const Comparison = lazy(() => import('./pages/Comparison'))
const Findings = lazy(() => import('./pages/Findings'))
const Predict = lazy(() => import('./pages/Predict'))
const Experiments = lazy(() => import('./pages/Experiments'))
const NotFound = lazy(() => import('./pages/NotFound'))

const BASE_NAV = [
  { to: '/',           label: 'Overview',       icon: LayoutDashboard },
  { to: '/dataset',    label: 'Dataset',        icon: Database        },
  { to: '/pipeline',   label: 'Pipeline',       icon: GitBranch       },
  { to: '/results',    label: 'Results',        icon: BarChart3       },
  { to: '/comparison', label: 'Paper vs Rep.',  icon: BookOpen        },
  { to: '/predict',    label: 'Predict',        icon: Activity        },
  { to: '/findings',   label: 'Findings',       icon: Lightbulb       },
]

function ScrollAndTitleManager() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)

    const titles: Record<string, string> = {
      '/': 'Overview | Heart Disease ML Replication',
      '/dataset': 'Dataset Analysis | Heart Disease ML Replication',
      '/pipeline': 'Methodology & Pipeline | Heart Disease ML Replication',
      '/results': 'Model Results | Heart Disease ML Replication',
      '/comparison': 'Paper vs Replication | Heart Disease ML Replication',
      '/predict': 'Live Risk Predictor | Heart Disease ML Replication',
      '/findings': 'Critical Findings | Heart Disease ML Replication',
      '/experiments': 'Methodological Variants | Heart Disease ML Replication',
    }
    document.title = titles[location.pathname] || 'Heart Disease ML Replication'
  }, [location.pathname])

  return null
}

function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh] text-muted">
      <Loader2 size={24} className="animate-spin text-teal mr-2" />
      <span className="text-sm">Loading view...</span>
    </div>
  )
}

function TopBar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { theme, toggle } = useTheme()
  return (
    <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-border flex items-center gap-3 px-5 h-14">
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Open sidebar navigation' : 'Close sidebar navigation'}
        className="text-muted hover:text-text p-1.5 rounded-lg border border-border hover:border-slate-500/40 transition-colors"
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
      <span className="flex-1" />
      <span className="text-xs text-muted font-medium hidden sm:inline">
        Heart Disease ML Replication (Simanjuntak et al. 2025)
      </span>
      <button
        onClick={toggle}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-text border border-border hover:border-slate-500/40 px-3 py-1.5 rounded-lg transition-colors"
      >
        {theme === 'dark' ? <Sun size={14} className="text-amber" /> : <Moon size={14} className="text-slateBlue" />}
        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
    </header>
  )
}

function Sidebar({ collapsed, navItems }: { collapsed: boolean; navItems: typeof BASE_NAV }) {
  const location = useLocation()
  return (
    <motion.aside
      animate={{ width: collapsed ? 0 : 220 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="hidden md:block flex-shrink-0 bg-surface border-r border-border sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto overflow-x-hidden select-none"
    >
      <div className="w-[220px] py-4">
        {/* Logo */}
        <div className="px-5 pb-5 pt-1 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
            <FlaskConical size={18} />
          </div>
          <div>
            <div className="text-sm font-bold text-text tracking-tight">ML Lab</div>
            <div className="text-[10px] text-muted font-medium">Heart Disease Study</div>
          </div>
        </div>

        <nav aria-label="Main navigation" className="space-y-0.5 px-2">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive ? 'text-teal font-semibold' : 'text-muted hover:text-text hover:bg-white/[0.03]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="navPill"
                    className="absolute inset-0 bg-teal/10 border-r-2 border-teal rounded-xl pointer-events-none"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <Icon size={16} className="relative z-10" />
                <span className="relative z-10">{label}</span>
                {isActive && (
                  <span className="ml-auto relative z-10 text-teal">
                    <ChevronRight size={14} />
                  </span>
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
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full"
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
      .then(res => {
        const ct = res.headers.get('content-type') || ''
        if (res.ok && ct.includes('application/json')) {
          return res.json().then(() => setHasVariants(true)).catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  const navItems = hasVariants
    ? [...BASE_NAV, { to: '/experiments', label: 'Experiments', icon: FlaskConical }]
    : BASE_NAV

  useEffect(() => {
    const fn = () => {
      const isMobile = window.innerWidth < 768
      setMobile(isMobile)
    }
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      {/* Skip to main content accessibility link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-teal focus:text-slate-950 focus:font-semibold focus:rounded-xl focus:shadow-xl focus:outline-none"
      >
        Skip to main content
      </a>

      <TopBar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      <div className="flex flex-1 relative">
        <Sidebar collapsed={collapsed} navItems={navItems} />

        <main id="main-content" tabIndex={-1} className="flex-1 w-full min-w-0 outline-none pb-20 md:pb-8">
          <ErrorBoundary>
            <Suspense fallback={<PageLoading />}>
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
                  <Route path="*"            element={<NotFound />} />
                </Routes>
              </PageTransition>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Accessible mobile bottom navigation: shows all routes via horizontal scroll */}
      {mobile && (
        <nav
          aria-label="Mobile bottom navigation"
          className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border flex items-center overflow-x-auto no-scrollbar py-1.5 px-2 gap-1 shadow-lg"
        >
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-shrink-0 flex flex-col items-center justify-center px-3 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                  isActive ? 'text-teal font-semibold bg-teal/10' : 'text-muted hover:text-text'
                }`
              }
            >
              <Icon size={16} className="mb-0.5" />
              <span className="whitespace-nowrap">{label}</span>
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
        <ScrollAndTitleManager />
        <Shell />
      </HashRouter>
    </ThemeProvider>
  )
}
