import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  glow?: boolean
}

export function Card({ children, className = '', _glow = false, style, ...props }: CardProps & { _glow?: boolean }) {
  return (
    <div
      className={`card-glow ${className}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '20px',
        position: 'relative',
        transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'paper' | 'mine'
}) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    default: { bg: 'rgba(148,163,184,0.12)', color: 'var(--text)', border: 'rgba(148,163,184,0.2)' },
    success: { bg: 'rgba(52,211,153,0.12)', color: '#34D399', border: 'rgba(52,211,153,0.3)' },
    warning: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: 'rgba(245,158,11,0.3)' },
    danger:  { bg: 'rgba(251,113,133,0.12)', color: '#FB7185', border: 'rgba(251,113,133,0.3)' },
    info:    { bg: 'rgba(45,212,191,0.12)', color: '#2DD4BF', border: 'rgba(45,212,191,0.3)' },
    paper:   { bg: 'rgba(127,166,214,0.15)', color: '#7FA6D6', border: 'rgba(127,166,214,0.3)' },
    mine:    { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: 'rgba(245,158,11,0.3)' },
  }
  const s = styles[variant] || styles.default

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        fontSize: '11px',
        fontWeight: 600,
        borderRadius: '6px',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        lineHeight: 1.4,
        letterSpacing: '0.01em',
      }}
    >
      {children}
    </span>
  )
}
