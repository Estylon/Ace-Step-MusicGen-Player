import type { ReactNode } from 'react'
import clsx from 'clsx'
import GPUStatusBadge from '../shared/GPUStatusBadge'

interface HeaderProps {
  title: string
  subtitle?: string
  children?: ReactNode
}

export default function Header({ title, subtitle, children }: HeaderProps) {
  return (
    <header
      className={clsx(
        'flex items-center justify-between',
        'px-6 h-14 shrink-0',
        'border-b border-[var(--border)]',
        'bg-[var(--bg-primary)]',
      )}
    >
      <div className="flex flex-col gap-0">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-[var(--text-muted)] -mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {children}
        <GPUStatusBadge />
      </div>
    </header>
  )
}
