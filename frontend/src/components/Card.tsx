import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  glow?: boolean
}

export function Card({ children, className = '', glow = false, style, ...props }: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-2xl p-5 relative transition-all duration-200 hover:border-slate-500/30 ${
        glow ? 'card-glow' : ''
      } ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'paper' | 'mine'
}

export function Badge({
  children,
  variant = 'default',
  className = '',
  style,
  ...props
}: BadgeProps) {
  const variantClasses: Record<string, string> = {
    default: 'bg-slate-400/10 text-slate-300 border-slate-400/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    danger:  'bg-rose-500/10 text-rose-400 border-rose-500/30',
    info:    'bg-teal/10 text-teal border-teal/30',
    paper:   'bg-blue-500/15 text-blue-300 border-blue-500/30',
    mine:    'bg-amber-500/15 text-amber-300 border-amber-500/30',
  }

  const selectedClass = variantClasses[variant] || variantClasses.default

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md border leading-tight tracking-wide ${selectedClass} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </span>
  )
}
