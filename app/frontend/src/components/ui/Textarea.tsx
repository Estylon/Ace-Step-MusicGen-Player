import { forwardRef, useCallback, useEffect, useRef, type TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  maxLength?: number
  autoResize?: boolean
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, maxLength, autoResize = false, className, id, value, onChange, ...rest }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const internalRef = useRef<HTMLTextAreaElement | null>(null)

    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          (ref as React.RefObject<HTMLTextAreaElement | null>).current = node
        }
      },
      [ref],
    )

    const adjustHeight = useCallback(() => {
      const textarea = internalRef.current
      if (textarea && autoResize) {
        textarea.style.height = 'auto'
        textarea.style.height = `${textarea.scrollHeight}px`
      }
    }, [autoResize])

    useEffect(() => {
      adjustHeight()
    }, [value, adjustHeight])

    const currentLength = typeof value === 'string' ? value.length : 0

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-[var(--text-secondary)]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={setRefs}
          id={textareaId}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          className={clsx(
            'w-full rounded-[var(--radius)] px-3 py-2 text-sm',
            'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
            'border border-[var(--border)]',
            'placeholder:text-[var(--text-muted)]',
            'transition-colors duration-[var(--transition)]',
            'hover:border-[var(--border-hover)]',
            'focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]',
            'resize-y min-h-[80px]',
            autoResize && 'resize-none overflow-hidden',
            error && 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
          )}
          {...rest}
        />
        <div className="flex justify-between">
          {error && (
            <p className="text-xs text-[var(--error)]">{error}</p>
          )}
          {maxLength != null && (
            <p
              className={clsx(
                'text-xs ml-auto',
                currentLength > maxLength * 0.9
                  ? 'text-[var(--warning)]'
                  : 'text-[var(--text-muted)]',
              )}
            >
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'

export default Textarea
