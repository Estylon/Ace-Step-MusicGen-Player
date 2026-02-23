import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'

const variantStyles = {
  primary:
    'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:brightness-90 glow-accent',
  secondary:
    'bg-transparent border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
  danger:
    'bg-[var(--error)] text-white hover:brightness-110 active:brightness-90',
} as const

const sizeStyles = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-[var(--radius-sm)]',
  md: 'h-9 px-4 text-sm gap-2 rounded-[var(--radius)]',
  lg: 'h-11 px-6 text-base gap-2.5 rounded-[var(--radius)]',
} as const

type ButtonVariant = keyof typeof variantStyles
type ButtonSize = keyof typeof sizeStyles

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-[var(--transition)]',
          'select-none whitespace-nowrap',
          'focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2',
          variantStyles[variant],
          sizeStyles[size],
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className,
        )}
        {...rest}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'

export default Button
