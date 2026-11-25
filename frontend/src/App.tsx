import React, { useEffect, Suspense, lazy } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ThemeProvider } from './ThemeContext'
import { TopBar } from './components/TopBar'
import { ErrorBoundary } from './components/ErrorBoundary'

// Lazy-load route bundles to keep initial JS lightweight
const Home = lazy(() => import('./pages/Home'))
const Workbench = lazy(() => import('./pages/Workbench'))
const Predict = lazy(() => import('./pages/Predict'))
const NotFound = lazy(() => import('./pages/NotFound'))

function ScrollAndTitleManager() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    const titles: Record<string, string> = {
      '/': 'The Replication Notebook — Heart Disease ML Study (JAIC 2025)',
      '/workbench': 'Data Workbench — The Replication Notebook',
      '/predict': 'Consultation Sheet (/predict) — The Replication Notebook',
    }
    document.title = titles[location.pathname] || 'The Replication Notebook'
  }, [location.pathname])

  return null
}

function PageLoading() {
  return (
    <div className="notebook-column py-24 text-sm font-mono text-muted">
      Loading notebook section…
    </div>
  )
}

function PaperGrainOverlay() {
  return (
    <svg id="grain-overlay" aria-hidden="true">
      <filter id="paper-noise-filter">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.80"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#paper-noise-filter)" />
    </svg>
  )
}

function Shell() {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink relative">
      <PaperGrainOverlay />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-ink focus:text-bg focus:font-mono focus:text-xs focus:rounded-[2px] focus:outline-none"
      >
        Skip to main content
      </a>

      <TopBar />

      <main id="main-content" tabIndex={-1} className="flex-1 w-full outline-none">
        <ErrorBoundary>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/workbench" element={<Workbench />} />
              <Route path="/predict" element={<Predict />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
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
