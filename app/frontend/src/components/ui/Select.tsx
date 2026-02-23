import * as RadixSelect from '@radix-ui/react-select'
import { ChevronDown, Check } from 'lucide-react'
import clsx from 'clsx'

// Radix Select does not allow empty-string values on items.
// We use a sentinel internally and convert back to '' for the caller.
const EMPTY_SENTINEL = '__empty__'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  options: SelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function Select({
  label,
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  className,
}: SelectProps) {
  // Map empty values to sentinel for Radix compatibility
  const internalValue = value === '' ? EMPTY_SENTINEL : value
  const handleChange = (v: string) => onValueChange(v === EMPTY_SENTINEL ? '' : v)

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </span>
      )}
      <RadixSelect.Root value={internalValue} onValueChange={handleChange}>
        <RadixSelect.Trigger
          className={clsx(
            'inline-flex items-center justify-between',
            'h-9 w-full rounded-[var(--radius)] px-3 text-sm',
            'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
            'border border-[var(--border)]',
            'transition-colors duration-[var(--transition)]',
            'hover:border-[var(--border-hover)]',
            'focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]',
            'data-[placeholder]:text-[var(--text-muted)]',
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            className={clsx(
              'overflow-hidden rounded-[var(--radius-lg)]',
              'bg-[var(--bg-elevated)] border border-[var(--border)]',
              'shadow-[var(--shadow-lg)]',
              'z-50',
              'animate-in fade-in-0 zoom-in-95',
            )}
            position="popper"
            sideOffset={4}
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => {
                const itemValue = option.value === '' ? EMPTY_SENTINEL : option.value
                return (
                  <RadixSelect.Item
                    key={itemValue}
                    value={itemValue}
                    className={clsx(
                      'relative flex items-center h-8 px-8 text-sm rounded-[var(--radius-sm)]',
                      'text-[var(--text-primary)] select-none',
                      'data-[highlighted]:bg-[var(--accent-muted)] data-[highlighted]:text-[var(--text-primary)]',
                      'data-[highlighted]:outline-none',
                      'cursor-pointer',
                    )}
                  >
                    <RadixSelect.ItemIndicator className="absolute left-2 inline-flex items-center">
                      <Check className="h-3.5 w-3.5 text-[var(--accent)]" />
                    </RadixSelect.ItemIndicator>
                    <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  </RadixSelect.Item>
                )
              })}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  )
}
