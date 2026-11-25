import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'ochre'
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
  const baseClasses =
    'inline-flex items-center justify-center font-sans font-medium rounded-[2px] transition-colors duration-150 focus-visible:outline-none disabled:opacity-45 disabled:cursor-not-allowed select-none cursor-pointer'

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  }[size]

  const variantClasses = {
    primary: 'bg-ink text-bg hover:opacity-90 border border-ink',
    secondary: 'bg-surface text-ink border border-rule hover:border-ink/40',
    outline: 'border border-rule text-ink hover:border-ink bg-transparent',
    ghost: 'text-muted hover:text-ink hover:bg-ink/5 border border-transparent',
    ochre: 'bg-ochre text-[#1B1A17] border border-ochre hover:brightness-95 font-semibold',
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
