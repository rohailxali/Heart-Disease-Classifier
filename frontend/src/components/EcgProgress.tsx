import React, { useEffect } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'

/**
 * Repeats a clean PQRST cardiac beat motif along a 1200-unit horizontal path.
 * Connected directly to window vertical scroll progress via SVG pathLength.
 */
function buildEcgRibbonPath(): string {
  const cycles = 12
  const w = 1200 / cycles // 100 per beat
  const parts: string[] = ['M 0 11']
  for (let i = 0; i < cycles; i++) {
    const x = i * w
    parts.push(
      `L ${x + 30} 11`,
      `Q ${x + 35} 8.5, ${x + 40} 11`, // P wave
      `L ${x + 47} 11`,
      `L ${x + 50} 13`,                 // Q dip
      `L ${x + 54} 2`,                  // R peak
      `L ${x + 58} 19`,                 // S dip
      `L ${x + 62} 11`,
      `Q ${x + 71} 6.5, ${x + 80} 11`,  // T wave
      `L ${x + w} 11`
    )
  }
  return parts.join(' ')
}

const ECG_PATH = buildEcgRibbonPath()

export function EcgProgress() {
  const rawProgress = useMotionValue(0)
  const smoothProgress = useSpring(rawProgress, { stiffness: 260, damping: 32, restDelta: 0.001 })
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const update = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      if (maxScroll <= 16) {
        rawProgress.set(0)
      } else {
        rawProgress.set(Math.min(1, Math.max(0, window.scrollY / maxScroll)))
      }
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(document.documentElement)

    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      ro?.disconnect()
    }
  }, [rawProgress])

  return (
    <div
      aria-hidden="true"
      className="w-full h-3.5 overflow-hidden bg-transparent pointer-events-none select-none"
    >
      <svg
        viewBox="0 0 1200 22"
        preserveAspectRatio="none"
        className="w-full h-full block"
      >
        {/* Subtle baseline ghost trace */}
        <path
          d={ECG_PATH}
          fill="none"
          stroke="var(--color-rule)"
          strokeWidth="0.9"
          opacity="0.7"
        />
        {/* Live scroll-driven oxblood cardiac trace */}
        {reduceMotion ? (
          <path
            d={ECG_PATH}
            fill="none"
            stroke="var(--color-oxblood)"
            strokeWidth="1.4"
          />
        ) : (
          <motion.path
            d={ECG_PATH}
            fill="none"
            stroke="var(--color-oxblood)"
            strokeWidth="1.4"
            style={{ pathLength: smoothProgress }}
          />
        )}
      </svg>
    </div>
  )
}
