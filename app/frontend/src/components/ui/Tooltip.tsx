import * as RadixTooltip from '@radix-ui/react-tooltip'
import clsx from 'clsx'
import type { ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayDuration?: number
}

export default function Tooltip({
  content,
  children,
  side = 'top',
  delayDuration = 300,
}: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            className={clsx(
              'z-50 px-3 py-1.5 text-xs font-medium',
              'rounded-[var(--radius)] shadow-[var(--shadow)]',
              'bg-[var(--bg-elevated)] text-[var(--text-primary)]',
              'border border-[var(--border)]',
              'animate-in fade-in-0 zoom-in-95',
              'select-none',
            )}
          >
            {content}
            <RadixTooltip.Arrow className="fill-[var(--bg-elevated)]" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}
