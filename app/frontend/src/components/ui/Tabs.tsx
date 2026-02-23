import * as RadixTabs from '@radix-ui/react-tabs'
import clsx from 'clsx'
import type { ReactNode } from 'react'

/* ── Root ────────────────────────────────────────────────────────────────── */

interface TabsRootProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: ReactNode
}

export function TabsRoot({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}: TabsRootProps) {
  return (
    <RadixTabs.Root
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      className={clsx('flex flex-col', className)}
    >
      {children}
    </RadixTabs.Root>
  )
}

/* ── List ────────────────────────────────────────────────────────────────── */

interface TabsListProps {
  className?: string
  children: ReactNode
}

export function TabsList({ className, children }: TabsListProps) {
  return (
    <RadixTabs.List
      className={clsx(
        'inline-flex items-center gap-1 p-1',
        'rounded-[var(--radius-lg)]',
        'bg-[var(--bg-secondary)]',
        className,
      )}
    >
      {children}
    </RadixTabs.List>
  )
}

/* ── Trigger ─────────────────────────────────────────────────────────────── */

interface TabsTriggerProps {
  value: string
  className?: string
  children: ReactNode
}

export function TabsTrigger({ value, className, children }: TabsTriggerProps) {
  return (
    <RadixTabs.Trigger
      value={value}
      className={clsx(
        'inline-flex items-center justify-center px-4 py-1.5',
        'text-sm font-medium rounded-[var(--radius)]',
        'text-[var(--text-muted)]',
        'transition-all duration-[var(--transition)]',
        'hover:text-[var(--text-secondary)]',
        'data-[state=active]:bg-[var(--accent)]',
        'data-[state=active]:text-white',
        'data-[state=active]:shadow-[var(--shadow-sm)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        className,
      )}
    >
      {children}
    </RadixTabs.Trigger>
  )
}

/* ── Content ─────────────────────────────────────────────────────────────── */

interface TabsContentProps {
  value: string
  className?: string
  children: ReactNode
}

export function TabsContent({ value, className, children }: TabsContentProps) {
  return (
    <RadixTabs.Content
      value={value}
      className={clsx('mt-4 focus-visible:outline-none', className)}
    >
      {children}
    </RadixTabs.Content>
  )
}
