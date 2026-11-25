import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus-visible:ring-2 focus-visible:ring-teal focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none'

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  }[size]

  const variantClasses = {
    primary: 'bg-teal text-slate-950 hover:bg-teal/90 font-semibold shadow-sm active:scale-[0.98]',
    secondary: 'bg-elevated text-text border border-border hover:border-slate-500/40 hover:bg-elevated/80 active:scale-[0.98]',
    outline: 'border border-border text-text hover:border-teal/50 hover:text-teal bg-transparent active:scale-[0.98]',
    ghost: 'text-muted hover:text-text hover:bg-white/5 active:scale-[0.98]',
    danger: 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 active:scale-[0.98]',
  }[variant]

  return (
    <button
      ref={ref}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})
Button.displayName = 'Button'
