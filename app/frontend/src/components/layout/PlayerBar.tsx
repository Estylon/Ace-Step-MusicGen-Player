import { useCallback, useRef } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
} from 'lucide-react'
import clsx from 'clsx'
import { usePlayerStore } from '../../stores/usePlayerStore'
import AudioVisualizer from '../player/AudioVisualizer'
import Slider from '../ui/Slider'
import { formatDuration } from '../../lib/utils'

export default function PlayerBar() {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const volume = usePlayerStore((s) => s.volume)
  const repeatMode = usePlayerStore((s) => s.repeatMode)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const pause = usePlayerStore((s) => s.pause)
  const resume = usePlayerStore((s) => s.resume)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const seek = usePlayerStore((s) => s.seek)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const toggleRepeat = usePlayerStore((s) => s.toggleRepeat)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)

  const seekBarRef = useRef<HTMLDivElement>(null)

  const progress = duration > 0 ? currentTime / duration : 0

  const handlePlayPause = () => {
    if (isPlaying) pause()
    else resume()
  }

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!seekBarRef.current || duration <= 0) return
      const rect = seekBarRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      seek(ratio * duration)
    },
    [duration, seek],
  )

  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat

  return (
    <div
      className={clsx(
        'fixed bottom-0 left-0 right-0 z-50',
        'flex flex-col',
        'bg-[var(--bg-secondary)]/95 backdrop-blur-xl',
        'border-t border-[var(--border)]',
      )}
      style={{ height: 'var(--player-height)' }}
    >
      {/* ── Top seek bar (thin, full-width) ─────────────────────────────── */}
      <div
        ref={seekBarRef}
        onClick={handleSeek}
        className="group relative w-full h-1.5 cursor-pointer shrink-0 hover:h-2.5 transition-all duration-150"
      >
        {/* Background track */}
        <div className="absolute inset-0 bg-[var(--bg-elevated)]" />
        {/* Filled progress */}
        <div
          className="absolute left-0 top-0 bottom-0 bg-[var(--accent)] transition-none"
          style={{ width: `${progress * 100}%` }}
        />
        {/* Hover thumb */}
        <div
          className={clsx(
            'absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full',
            'bg-white shadow-md',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
            'pointer-events-none',
          )}
          style={{ left: `calc(${progress * 100}% - 6px)` }}
        />
      </div>

      {/* ── Main bar content ────────────────────────────────────────────── */}
      <div className="flex items-center flex-1 px-4 gap-4 min-w-0">
        {/* ── LEFT: Track Info ────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-1 min-w-0 max-w-[30%]">
          {/* Album art orb */}
          <div
            className={clsx(
              'w-11 h-11 rounded-lg shrink-0 overflow-hidden',
              'bg-gradient-accent',
              isPlaying && 'animate-pulse-slow',
            )}
          >
            <div
              className={clsx(
                'w-full h-full',
                'bg-gradient-to-br from-white/10 to-transparent',
              )}
            />
          </div>
          {currentTrack ? (
            <div className="flex flex-col min-w-0 gap-0.5">
              <span className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">
                {currentTrack.title || 'Untitled Track'}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] truncate leading-tight">
                {currentTrack.caption
                  ? currentTrack.caption.length > 50
                    ? currentTrack.caption.slice(0, 47) + '...'
                    : currentTrack.caption
                  : currentTrack.model_name}
              </span>
            </div>
          ) : (
            <span className="text-sm text-[var(--text-muted)]">
              No track selected
            </span>
          )}
        </div>

        {/* ── CENTER: Controls + Time ────────────────────────────────── */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={clsx(
              'p-1.5 rounded-full transition-colors duration-150',
              shuffle
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
            )}
            aria-label="Shuffle"
          >
            <Shuffle className="h-3.5 w-3.5" />
          </button>

          {/* Prev */}
          <button
            onClick={prev}
            className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Previous"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={handlePlayPause}
            disabled={!currentTrack}
            className={clsx(
              'p-2.5 rounded-full transition-all duration-150',
              'bg-white text-[var(--bg-primary)]',
              'hover:scale-105 hover:shadow-lg',
              'active:scale-95',
              'disabled:opacity-30 disabled:hover:scale-100',
            )}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={next}
            className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Next"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          {/* Repeat */}
          <button
            onClick={toggleRepeat}
            className={clsx(
              'p-1.5 rounded-full transition-colors duration-150',
              repeatMode !== 'none'
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
            )}
            aria-label={`Repeat: ${repeatMode}`}
          >
            <RepeatIcon className="h-3.5 w-3.5" />
          </button>

          {/* Time display */}
          <span className="text-[11px] tabular-nums text-[var(--text-muted)] w-[90px] text-center select-none">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
        </div>

        {/* ── RIGHT: Visualizer + Volume ─────────────────────────────── */}
        <div className="flex items-center gap-3 flex-1 justify-end min-w-0 max-w-[30%]">
          {/* Visualizer */}
          <AudioVisualizer
            width={100}
            height={32}
            barCount={20}
            className="shrink-0 hidden sm:block"
          />

          {/* Volume */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              aria-label={volume > 0 ? 'Mute' : 'Unmute'}
            >
              {volume > 0 ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>
            <div className="w-20">
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
      </div>
    </div>
  )
}
