import * as RadixCollapsible from '@radix-ui/react-collapsible'
import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import clsx from 'clsx'

interface CollapsibleProps {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}

export default function Collapsible({
  title,
  defaultOpen = false,
  children,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <RadixCollapsible.Root open={open} onOpenChange={setOpen}>
      <RadixCollapsible.Trigger
        className={clsx(
          'flex items-center justify-between w-full py-2 px-1',
          'text-sm font-medium text-[var(--text-secondary)]',
          'hover:text-[var(--text-primary)]',
          'transition-colors duration-[var(--transition)]',
          'focus-visible:outline-none',
        )}
      >
        {title}
        <ChevronDown
          className={clsx(
            'h-4 w-4 shrink-0 text-[var(--text-muted)]',
            'transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </RadixCollapsible.Trigger>
      <RadixCollapsible.Content
        className={clsx(
          'overflow-hidden',
          'data-[state=open]:animate-slideDown',
          'data-[state=closed]:animate-slideUp',
        )}
      >
        <div className="pt-1 pb-2">{children}</div>
      </RadixCollapsible.Content>
    </RadixCollapsible.Root>
  )
}
