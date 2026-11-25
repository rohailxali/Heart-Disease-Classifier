import React from 'react'

export type ChipVariant = 'neutral' | 'paper' | 'replication' | 'disease' | 'healthy' | 'warning'

export interface ChipProps {
  variant?: ChipVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

export function Chip({ variant = 'neutral', children, className = '', dot = false }: ChipProps) {
  const styles: Record<ChipVariant, string> = {
    neutral:     'border-rule text-muted bg-transparent',
    paper:       'border-slate text-slate bg-transparent',
    replication: 'border-ochre text-ink bg-ochre/15',
    disease:     'border-oxblood/50 text-ink bg-oxblood/10',
    healthy:     'border-green/50 text-ink bg-green/10',
    warning:     'border-ochre/60 text-ochreInk bg-ochre/10',
  }

  const dotColors: Record<ChipVariant, string> = {
    neutral:     'bg-muted',
    paper:       'border border-slate bg-transparent',
    replication: 'bg-ochre',
    disease:     'bg-oxblood',
    healthy:     'bg-green',
    warning:     'bg-ochre',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono tracking-tight border rounded-[2px] whitespace-nowrap ${styles[variant]} ${className}`}
    >
      {dot && (
        <span aria-hidden="true" className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${dotColors[variant]}`} />
      )}
      <span>{children}</span>
    </span>
  )
}
