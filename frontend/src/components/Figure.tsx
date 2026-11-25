import React from 'react'
import { TableFallback } from './TableFallback'

interface FigureProps {
  label: string
  title: string
  subtitle?: string
  controls?: React.ReactNode
  caption?: string
  source?: string
  fallback?: {
    caption: string
    headers: string[]
    rows: (string | number)[][]
  }
  children: React.ReactNode
  className?: string
}

/**
 * Editorial figure container: hairline top/bottom rules instead of enclosed boxes,
 * Fraunces header, monospace source attribution, and screen-reader table fallback.
 */
export function Figure({
  label,
  title,
  subtitle,
  controls,
  caption,
  source,
  fallback,
  children,
  className = '',
}: FigureProps) {
  return (
    <figure className={`border-t border-b border-rule py-6 my-8 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted mb-1">
            {label}
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-semibold text-ink tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-muted mt-1 max-w-2xl leading-snug">
              {subtitle}
            </p>
          )}
        </div>
        {controls && (
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {controls}
          </div>
        )}
      </div>

      <div className="relative w-full">
        {children}
      </div>

      {fallback && (
        <TableFallback
          caption={fallback.caption}
          headers={fallback.headers}
          rows={fallback.rows}
        />
      )}

      {(caption || source) && (
        <figcaption className="mt-4 pt-3 border-t border-rule/60 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 text-xs">
          {caption && <span className="marginalia text-sm text-muted">{caption}</span>}
          {source && (
            <span className="font-mono text-[11px] text-muted sm:text-right flex-shrink-0">
              {source}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  )
}
