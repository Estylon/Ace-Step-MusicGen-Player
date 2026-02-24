import { useState } from 'react'
import { Star } from 'lucide-react'
import clsx from 'clsx'

interface StarRatingProps {
  value: number
  onChange?: (rating: number) => void
  size?: 'sm' | 'md'
  className?: string
}

const sizeClasses = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
} as const

export default function StarRating({
  value,
  onChange,
  size = 'md',
  className,
}: StarRatingProps) {
  const [hoverIndex, setHoverIndex] = useState<number>(-1)

  const interactive = typeof onChange === 'function'

  const handleClick = (i: number) => {
    if (!interactive) return
    // Clicking the same value again clears the rating
    if (value === i + 1) {
      onChange(0)
    } else {
      onChange(i + 1)
    }
  }

  return (
    <div
      className={clsx('inline-flex items-center gap-0.5', className)}
      onMouseLeave={() => {
        if (interactive) setHoverIndex(-1)
      }}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const filled =
          hoverIndex >= 0 ? i <= hoverIndex : i < value

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => handleClick(i)}
            onMouseEnter={() => {
              if (interactive) setHoverIndex(i)
            }}
            className={clsx(
              'p-0 border-0 bg-transparent transition-colors',
              interactive && 'cursor-pointer hover:scale-110',
              !interactive && 'cursor-default',
            )}
          >
            <Star
              className={clsx(
                sizeClasses[size],
                'transition-colors',
                filled
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text-muted)]',
              )}
              fill={filled ? 'currentColor' : 'none'}
            />
          </button>
        )
      })}
    </div>
  )
}
