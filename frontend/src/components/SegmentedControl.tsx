import React, { useRef } from 'react'
import { motion } from 'framer-motion'

export interface SegmentedOption<T extends string | number> {
  value: T
  label: React.ReactNode
}

export interface SegmentedControlProps<T extends string | number> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  name?: string
  size?: 'sm' | 'md'
  className?: string
  ariaLabel?: string
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  name,
  size = 'md',
  className = '',
  ariaLabel = 'Segmented options',
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (index + 1) % options.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (index - 1 + options.length) % options.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = options.length - 1
    }

    if (nextIndex >= 0) {
      e.preventDefault()
      onChange(options[nextIndex].value)
      const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      buttons?.[nextIndex]?.focus()
    }
  }

  const paddingClass = size === 'sm' ? 'p-0.5 text-xs' : 'p-1 text-sm'
  const itemPadding = size === 'sm' ? 'px-2.5 py-1' : 'px-3.5 py-1.5'

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex items-center bg-elevated border border-border rounded-xl ${paddingClass} ${className}`}
    >
      {options.map((opt, i) => {
        const isSelected = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            name={name}
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`relative flex items-center justify-center font-medium rounded-lg transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-teal ${itemPadding} ${
              isSelected ? 'text-text font-semibold' : 'text-muted hover:text-text'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId={`segmented-active-${name || 'default'}`}
                className="absolute inset-0 bg-surface rounded-lg shadow-sm border border-border"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
