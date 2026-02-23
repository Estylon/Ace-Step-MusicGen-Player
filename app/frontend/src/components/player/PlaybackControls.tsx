import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
} from 'lucide-react'
import clsx from 'clsx'
import { usePlayerStore } from '../../stores/usePlayerStore'

export default function PlaybackControls() {
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeatMode = usePlayerStore((s) => s.repeatMode)
  const pause = usePlayerStore((s) => s.pause)
  const resume = usePlayerStore((s) => s.resume)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const toggleRepeat = usePlayerStore((s) => s.toggleRepeat)

  const handlePlayPause = () => {
    if (isPlaying) {
      pause()
    } else {
      resume()
    }
  }

  // Determine repeat icon and active state
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat
  const repeatActive = repeatMode !== 'none'

  return (
    <div className="flex items-center gap-1">
      {/* Shuffle */}
      <button
        onClick={toggleShuffle}
        className={clsx(
          'p-2 rounded-full',
          'transition-colors duration-[var(--transition)]',
          shuffle
            ? 'text-[var(--accent)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
        )}
        aria-label={`Shuffle ${shuffle ? 'on' : 'off'}`}
        title={`Shuffle ${shuffle ? 'on' : 'off'}`}
      >
        <Shuffle className="h-4 w-4" />
      </button>

      {/* Previous */}
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

      {/* Play / Pause */}
      <button
        onClick={handlePlayPause}
        className={clsx(
          'flex items-center justify-center',
          'w-10 h-10 rounded-full',
          'bg-[var(--accent)] text-white',
          'hover:bg-[var(--accent-hover)]',
          'transition-colors duration-[var(--transition)]',
          'shadow-[var(--shadow-sm)]',
        )}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </button>

      {/* Next */}
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

      {/* Repeat */}
      <button
        onClick={toggleRepeat}
        className={clsx(
          'p-2 rounded-full',
          'transition-colors duration-[var(--transition)]',
          repeatActive
            ? 'text-[var(--accent)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
        )}
        aria-label={`Repeat: ${repeatMode}`}
        title={`Repeat: ${repeatMode}`}
      >
        <RepeatIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
