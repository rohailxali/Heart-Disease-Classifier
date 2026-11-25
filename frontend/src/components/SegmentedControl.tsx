import React, { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

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
  const reduceMotion = useReducedMotion()

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

  const sizePad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex flex-wrap items-center border border-rule bg-surface rounded-[2px] p-0.5 ${className}`}
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
            className={`relative flex items-center justify-center font-mono rounded-[1px] transition-colors duration-150 focus-visible:outline-none ${sizePad} ${
              isSelected ? 'text-bg font-medium' : 'text-muted hover:text-ink'
            }`}
          >
            {isSelected && (
              <motion.span
                layoutId={reduceMotion ? undefined : `stamp-${name || 'ctrl'}`}
                className="absolute inset-0 bg-ink rounded-[1px]"
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
