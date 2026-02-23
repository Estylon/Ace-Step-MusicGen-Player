import type { ReactNode } from 'react'
import clsx from 'clsx'

interface CardProps {
  className?: string
  children: ReactNode
  hover?: boolean
}

export default function Card({ className, children, hover = false }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-[var(--radius-lg)] p-4',
        'bg-[var(--bg-secondary)] border border-[var(--border)]',
        hover && [
          'transition-all duration-[var(--transition)]',
          'hover:border-[var(--border-hover)]',
          'hover:shadow-[var(--shadow)]',
          'hover:bg-[var(--bg-tertiary)]',
        ],
        className,
      )}
    >
      {children}
    </div>
  )
}
