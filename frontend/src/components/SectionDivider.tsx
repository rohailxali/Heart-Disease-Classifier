import React from 'react'

interface SectionDividerProps {
  variant?: 'wave' | 'cell'
  className?: string
}

/**
 * Organic hairline section break between chapters of the notebook.
 */
export function SectionDivider({ variant = 'wave', className = '' }: SectionDividerProps) {
  return (
    <div aria-hidden="true" className={`w-full my-16 sm:my-24 overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 1200 24"
        preserveAspectRatio="none"
        className="w-full h-6 block"
      >
        {variant === 'wave' ? (
          <path
            d="M0 12 Q 150 4, 300 12 T 600 12 T 900 12 T 1200 12"
            fill="none"
            stroke="var(--color-rule)"
            strokeWidth="1"
          />
        ) : (
          <path
            d="M0 12 H 490 C 515 12, 525 3, 550 3 C 575 3, 585 21, 610 21 C 635 21, 645 12, 670 12 H 1200"
            fill="none"
            stroke="var(--color-rule)"
            strokeWidth="1"
          />
        )}
      </svg>
    </div>
  )
}
