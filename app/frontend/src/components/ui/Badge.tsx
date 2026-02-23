import type { ReactNode } from 'react'
import clsx from 'clsx'

const variantStyles = {
  default:
    'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)]',
  success:
    'bg-[var(--success-muted)] text-[var(--success)] border-transparent',
  warning:
    'bg-[var(--warning-muted)] text-[var(--warning)] border-transparent',
  error:
    'bg-[var(--error-muted)] text-[var(--error)] border-transparent',
  accent:
    'bg-[var(--accent-muted)] text-[var(--accent-hover)] border-transparent',
} as const

type BadgeVariant = keyof typeof variantStyles

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: ReactNode
}

export default function Badge({
  variant = 'default',
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5',
        'text-xs font-medium leading-none',
        'rounded-[var(--radius-full)] border',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
