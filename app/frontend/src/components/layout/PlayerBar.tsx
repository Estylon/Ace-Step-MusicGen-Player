import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import clsx from 'clsx'
import { usePlayerStore } from '../../stores/usePlayerStore'
import Slider from '../ui/Slider'

export default function PlayerBar() {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const pause = usePlayerStore((s) => s.pause)
  const resume = usePlayerStore((s) => s.resume)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const setVolume = usePlayerStore((s) => s.setVolume)

  const handlePlayPause = () => {
    if (isPlaying) {
      pause()
    } else {
      resume()
    }
  }

  return (
    <div
      className={clsx(
        'fixed bottom-0 left-0 right-0 z-50',
        'flex items-center px-4',
        'bg-[var(--bg-secondary)] border-t border-[var(--border)]',
        'backdrop-blur-sm',
      )}
      style={{ height: 'var(--player-height)' }}
    >
      {/* Left: Track info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mini album art placeholder */}
        <div
          className={clsx(
            'w-12 h-12 rounded-[var(--radius)] shrink-0',
            'bg-gradient-accent opacity-60',
          )}
        />
        {currentTrack ? (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {currentTrack.title}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {currentTrack.duration
                ? `${Math.floor(currentTrack.duration / 60)}:${String(Math.floor(currentTrack.duration % 60)).padStart(2, '0')}`
                : '--:--'}
            </span>
          </div>
        ) : (
          <span className="text-sm text-[var(--text-muted)]">
            No track selected
          </span>
        )}
      </div>

      {/* Center: Playback controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={prev}
          className={clsx(
            'p-2 rounded-full',
            'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            'transition-colors duration-[var(--transition)]',
          )}
          aria-label="Previous track"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        <button
          onClick={handlePlayPause}
          className={clsx(
            'p-2.5 rounded-full',
            'bg-[var(--accent)] text-white',
            'hover:bg-[var(--accent-hover)]',
            'transition-colors duration-[var(--transition)]',
          )}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </button>

        <button
          onClick={next}
          className={clsx(
            'p-2 rounded-full',
            'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            'transition-colors duration-[var(--transition)]',
          )}
          aria-label="Next track"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      {/* Right: Volume */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        <Volume2 className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
        <div className="w-24">
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[volume]}
            onValueChange={(v) => setVolume(v[0])}
          />
        </div>
      </div>
    </div>
  )
}
