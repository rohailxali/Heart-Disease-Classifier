import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface AnnotationProps {
  variant?: 'underline' | 'circle' | 'bracket'
  color?: 'oxblood' | 'ochre' | 'slate' | 'green'
  note?: string
  children: React.ReactNode
  className?: string
}

const STROKE_MAP = {
  oxblood: 'var(--color-oxblood)',
  ochre:   'var(--color-ochre)',
  slate:   'var(--color-slate)',
  green:   'var(--color-green)',
} as const

/**
 * Hand-drawn annotation stroke drawn once via SVG pathLength on viewport entry,
 * paired with a concise one-line italic marginalia note.
 */
export function Annotation({
  variant = 'underline',
  color = 'oxblood',
  note,
  children,
  className = '',
}: AnnotationProps) {
  const reduceMotion = useReducedMotion()
  const stroke = STROKE_MAP[color]

  return (
    <span className={`inline-flex flex-col items-start ${className}`}>
      <span className="relative inline-block">
        <span className="relative z-10">{children}</span>

        {variant === 'underline' && (
          <svg
            aria-hidden="true"
            viewBox="0 0 200 14"
            preserveAspectRatio="none"
            className="absolute left-0 -bottom-1 w-full h-3 pointer-events-none overflow-visible"
          >
            <motion.path
              d="M 2 9 Q 52 3, 102 8 T 198 6"
              fill="none"
              stroke={stroke}
              strokeWidth="2.2"
              strokeLinecap="round"
              initial={{ pathLength: reduceMotion ? 1 : 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: reduceMotion ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
        )}

        {variant === 'circle' && (
          <svg
            aria-hidden="true"
            viewBox="0 0 140 60"
            preserveAspectRatio="none"
            className="absolute -inset-x-3 -inset-y-2 w-[calc(100%+24px)] h-[calc(100%+16px)] pointer-events-none overflow-visible"
          >
            <motion.path
              d="M 16 32 C 6 12, 46 3, 82 5 C 120 7, 134 24, 122 40 C 108 55, 42 56, 14 44 C 4 39, 7 22, 26 14"
              fill="none"
              stroke={stroke}
              strokeWidth="1.9"
              strokeLinecap="round"
              initial={{ pathLength: reduceMotion ? 1 : 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: reduceMotion ? 0 : 0.85, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
        )}

        {variant === 'bracket' && (
          <svg
            aria-hidden="true"
            viewBox="0 0 14 100"
            preserveAspectRatio="none"
            className="absolute -left-3.5 top-0 h-full w-3 pointer-events-none overflow-visible"
          >
            <motion.path
              d="M 11 2 Q 3 4, 4 25 L 4 46 L 1 50 L 4 54 L 4 75 Q 3 96, 11 98"
              fill="none"
              stroke={stroke}
              strokeWidth="1.8"
              strokeLinecap="round"
              initial={{ pathLength: reduceMotion ? 1 : 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
        )}
      </span>

      {note && (
        <span className="marginalia text-xs text-muted mt-2 leading-snug">
          — {note}
        </span>
      )}
    </span>
  )
}
