import { useCallback, useRef } from 'react'
import clsx from 'clsx'

interface WaveformPlayerProps {
  peaks: number[]
  progress: number // 0 to 1
  onSeek?: (ratio: number) => void
  className?: string
}

export default function WaveformPlayer({
  peaks,
  progress,
  onSeek,
  className,
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Normalize peaks to 0-100 range for bar heights
  const maxPeak = Math.max(...peaks, 0.01)
  const normalizedBars = peaks.map((p) => Math.max(4, (p / maxPeak) * 100))

  const progressPercent = Math.max(0, Math.min(1, progress)) * 100

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSeek || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const ratio = Math.max(0, Math.min(1, x / rect.width))
      onSeek(ratio)
    },
    [onSeek],
  )

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={clsx(
        'relative flex items-end gap-px h-16 w-full',
        'cursor-pointer select-none',
        className,
      )}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progressPercent)}
      tabIndex={0}
    >
      {normalizedBars.map((h, i) => {
        const barPercent = ((i + 1) / normalizedBars.length) * 100
        const isPlayed = barPercent <= progressPercent

        return (
          <div
            key={i}
            className={clsx(
              'flex-1 rounded-sm min-w-[1px]',
              'transition-colors duration-100',
              isPlayed
                ? 'bg-[var(--waveform-progress)]'
                : 'bg-[var(--waveform-wave)]',
            )}
            style={{ height: `${h}%` }}
          />
        )
      })}

      {/* Cursor line */}
      <div
        className="absolute top-0 bottom-0 w-px bg-[var(--waveform-cursor)] pointer-events-none z-10"
        style={{ left: `${progressPercent}%` }}
      />
    </div>
  )
}
