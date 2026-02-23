import clsx from 'clsx'
import type { TrackInfo } from '../../types'

interface MiniPlayerProps {
  track: TrackInfo
  currentTime: number
  duration: number
}

export default function MiniPlayer({ track, currentTime, duration }: MiniPlayerProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-3 min-w-0">
      {/* Gradient art square */}
      <div
        className={clsx(
          'w-12 h-12 rounded-[var(--radius)] shrink-0',
          'bg-gradient-accent opacity-80',
        )}
      />

      {/* Track info + progress */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-sm font-medium text-[var(--text-primary)] truncate">
          {track.title}
        </span>
        <span className="text-xs text-[var(--text-muted)] truncate">
          {track.caption || 'No caption'}
        </span>

        {/* Tiny progress bar */}
        <div className="w-full h-0.5 rounded-full bg-[var(--bg-elevated)] mt-0.5">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
