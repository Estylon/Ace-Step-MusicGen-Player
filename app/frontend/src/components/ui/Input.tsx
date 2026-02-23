import { forwardRef, type InputHTMLAttributes } from 'react'
import clsx from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...rest }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--text-secondary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'h-9 w-full rounded-[var(--radius)] px-3 text-sm',
            'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
            'border border-[var(--border)]',
            'placeholder:text-[var(--text-muted)]',
            'transition-colors duration-[var(--transition)]',
            'hover:border-[var(--border-hover)]',
            'focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]',
            error && 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
          )}
          {...rest}
        />
        {error && (
          <p className="text-xs text-[var(--error)]">{error}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'

export default Input
