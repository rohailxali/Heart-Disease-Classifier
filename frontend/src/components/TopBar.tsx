import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Sun, Moon, Menu, X } from 'lucide-react'
import { useTheme } from '../useTheme'
import { EcgProgress } from './EcgProgress'

const CHAPTERS = [
  { id: 'ch1', num: 'I',   label: 'Question' },
  { id: 'ch2', num: 'II',  label: 'Patients' },
  { id: 'ch3', num: 'III', label: 'Method' },
  { id: 'ch4', num: 'IV',  label: 'Replication' },
  { id: 'ch5', num: 'V',   label: 'Gap' },
  { id: 'ch6', num: 'VI',  label: 'Catches' },
  { id: 'ch7', num: 'VII', label: 'Colophon' },
]

export function TopBar() {
  const { theme, toggle } = useTheme()
  const [sheetOpen, setSheetOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  const jumpToChapter = (chapterId: string) => {
    setSheetOpen(false)
    if (location.pathname !== '/') {
      navigate('/')
      setTimeout(() => {
        const el = document.getElementById(chapterId)
        el?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
      }, 120)
    } else {
      const el = document.getElementById(chapterId)
      el?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur-sm border-b border-rule/80">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 min-h-[3.25rem] py-2.5 flex items-center justify-between gap-4">
        {/* Wordmark */}
        <div className="flex items-baseline gap-2.5 min-w-0">
          <NavLink
            to="/"
            onClick={() => {
              setSheetOpen(false)
              window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
            }}
            className="font-display font-bold text-base sm:text-lg tracking-tight text-ink hover:opacity-80 whitespace-nowrap"
          >
            The Replication Notebook
          </NavLink>
          <span className="hidden xl:inline font-mono text-[11px] text-muted border-l border-rule pl-2.5 whitespace-nowrap">
            JAIC 9(6) · 2025
          </span>
        </div>

        {/* Desktop chapter anchors + routes */}
        <nav aria-label="Notebook navigation" className="hidden lg:flex items-center gap-1">
          {CHAPTERS.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => jumpToChapter(ch.id)}
              className="px-2 py-1 text-xs font-sans text-muted hover:text-ink transition-colors whitespace-nowrap"
            >
              <span className="font-mono text-[10px] mr-1 opacity-70">{ch.num}</span>
              <span>{ch.label}</span>
            </button>
          ))}

          <span className="h-4 w-px bg-rule mx-2" aria-hidden="true" />

          <NavLink
            to="/workbench"
            className={({ isActive }) =>
              `px-2.5 py-1 text-xs font-mono border rounded-[2px] transition-colors ${
                isActive
                  ? 'border-ink bg-ink text-bg font-medium'
                  : 'border-rule text-ink hover:border-ink/50'
              }`
            }
          >
            Workbench
          </NavLink>
          <NavLink
            to="/predict"
            className={({ isActive }) =>
              `px-2.5 py-1 text-xs font-mono border rounded-[2px] transition-colors ${
                isActive
                  ? 'border-ink bg-ink text-bg font-medium'
                  : 'border-rule text-ink hover:border-ink/50'
              }`
            }
          >
            Predict
          </NavLink>
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'light' ? 'dark ward-at-night' : 'light paper'} theme`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border border-rule rounded-[2px] text-muted hover:text-ink hover:border-ink/50 transition-colors"
          >
            {theme === 'light' ? (
              <>
                <Moon size={13} aria-hidden="true" />
                <span className="hidden sm:inline">Ward</span>
              </>
            ) : (
              <>
                <Sun size={13} aria-hidden="true" className="text-ochre" />
                <span className="hidden sm:inline">Paper</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={sheetOpen}
            className="lg:hidden inline-flex items-center justify-center p-1.5 border border-rule rounded-[2px] text-ink hover:border-ink/50"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Slim ECG scroll-progress ribbon */}
      <EcgProgress />

      {/* Mobile full-height navigation sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            className="fixed inset-0 z-50 bg-ink/40 lg:hidden"
            onClick={() => setSheetOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={reduceMotion ? { opacity: 0 } : { x: '100%' }}
              animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              className="fixed right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-surface border-l border-rule p-6 flex flex-col justify-between shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-rule mb-5">
                  <span className="font-display font-bold text-base text-ink">Contents</span>
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    aria-label="Close navigation menu"
                    className="p-1 text-muted hover:text-ink border border-rule rounded-[2px]"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">
                    Routes
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <NavLink
                      to="/"
                      end
                      onClick={() => setSheetOpen(false)}
                      className={({ isActive }) =>
                        `px-3 py-2 text-sm font-sans border-l-2 transition-colors ${
                          isActive ? 'border-ink text-ink font-semibold bg-ink/5' : 'border-transparent text-muted hover:text-ink'
                        }`
                      }
                    >
                      Notebook Essay (/)
                    </NavLink>
                    <NavLink
                      to="/workbench"
                      onClick={() => setSheetOpen(false)}
                      className={({ isActive }) =>
                        `px-3 py-2 text-sm font-sans border-l-2 transition-colors ${
                          isActive ? 'border-ink text-ink font-semibold bg-ink/5' : 'border-transparent text-muted hover:text-ink'
                        }`
                      }
                    >
                      Data Workbench (/workbench)
                    </NavLink>
                    <NavLink
                      to="/predict"
                      onClick={() => setSheetOpen(false)}
                      className={({ isActive }) =>
                        `px-3 py-2 text-sm font-sans border-l-2 transition-colors ${
                          isActive ? 'border-ink text-ink font-semibold bg-ink/5' : 'border-transparent text-muted hover:text-ink'
                        }`
                      }
                    >
                      Consultation Sheet (/predict)
                    </NavLink>
                  </div>
                </div>

                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">
                    Notebook Chapters
                  </div>
                  <div className="flex flex-col gap-1">
                    {CHAPTERS.map(ch => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => jumpToChapter(ch.id)}
                        className="text-left px-3 py-1.5 text-sm text-ink/90 hover:text-ink hover:bg-ink/5 rounded-[2px] flex items-baseline gap-2.5"
                      >
                        <span className="font-mono text-[11px] text-muted w-6">{ch.num}</span>
                        <span>{ch.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-rule text-xs text-muted font-mono">
                Theme: {theme === 'light' ? 'Paper (Light)' : 'Ward at Night (Dark)'}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
