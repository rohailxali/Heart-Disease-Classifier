import React, { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion, animate } from 'framer-motion'

interface NumeralProps {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  size?: 'md' | 'lg' | 'xl' | 'hero'
  className?: string
}

/**
 * Fraunces display numeral that counts up smoothly once when scrolled into view.
 * Obeys prefers-reduced-motion by rendering the exact final value immediately.
 */
export function Numeral({
  value,
  decimals = 1,
  prefix = '',
  suffix = '',
  size = 'lg',
  className = '',
}: NumeralProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState<number>(value)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (reduceMotion || hasAnimated.current) return
    if (!inView) return
    hasAnimated.current = true
    const ctrl = animate(0, value, {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: latest => setDisplay(latest),
    })
    return () => ctrl.stop()
  }, [value, inView, reduceMotion])

  const sizeClass = {
    md:   'text-3xl sm:text-4xl',
    lg:   'text-5xl sm:text-6xl',
    xl:   'text-6xl sm:text-7xl',
    hero: 'text-6xl sm:text-8xl lg:text-[112px]',
  }[size]

  const shown = reduceMotion ? value : display

  return (
    <span ref={ref} className={`numeral inline-block ${sizeClass} ${className}`}>
      {prefix}{shown.toFixed(decimals)}{suffix}
    </span>
  )
}
