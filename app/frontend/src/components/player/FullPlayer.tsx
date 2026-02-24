import { AnimatePresence, motion } from 'framer-motion'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
} from 'lucide-react'
import clsx from 'clsx'
import { usePlayerStore } from '../../stores/usePlayerStore'
import AudioVisualizer from './AudioVisualizer'
import Badge from '../ui/Badge'
import Slider from '../ui/Slider'
import { formatDuration } from '../../lib/utils'

export default function FullPlayer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const volume = usePlayerStore((s) => s.volume)
  const pause = usePlayerStore((s) => s.pause)
  const resume = usePlayerStore((s) => s.resume)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const seek = usePlayerStore((s) => s.seek)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const closeFullPlayer = usePlayerStore((s) => s.closeFullPlayer)
  const fullPlayerOpen = usePlayerStore((s) => s.fullPlayerOpen)
  const repeatMode = usePlayerStore((s) => s.repeatMode)
  const shuffleOn = usePlayerStore((s) => s.shuffle)
  const toggleRepeat = usePlayerStore((s) => s.toggleRepeat)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)

  const isInstrumental =
    !currentTrack?.lyrics || currentTrack.lyrics.trim() === '' || currentTrack.task_type === 'instrumental'

  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat

  return (
    <AnimatePresence>
      {fullPlayerOpen && currentTrack && (
        <motion.div
          key="full-player"
          className={clsx(
            'fixed inset-0 z-[60]',
            'bg-[var(--bg-primary)]/98 backdrop-blur-2xl',
            'flex flex-col',
          )}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        >
          {/* Top bar */}
          <div className="flex items-center px-4 py-3">
            <button
              type="button"
              onClick={closeFullPlayer}
              className={clsx(
                'p-2 rounded-lg',
                'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                'hover:bg-[var(--bg-elevated)] transition-colors',
              )}
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>

          {/* Center section */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 overflow-hidden">
            {/* Visualizer */}
            <AudioVisualizer
              width={300}
              height={120}
              barCount={48}
              className="shrink-0"
            />

            {/* Track title */}
            <div className="text-center max-w-lg">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] truncate">
                {currentTrack.title || 'Untitled'}
              </h1>
              {currentTrack.caption && (
                <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-2">
                  {currentTrack.caption}
                </p>
              )}
            </div>

            {/* Metadata badges */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {currentTrack.bpm != null && (
                <Badge variant="default">{currentTrack.bpm} BPM</Badge>
              )}
              {currentTrack.keyscale && (
                <Badge variant="default">{currentTrack.keyscale}</Badge>
              )}
              <Badge variant="default">
                {formatDuration(currentTrack.duration)}
              </Badge>
              {currentTrack.model_name && (
                <Badge variant="accent">{currentTrack.model_name}</Badge>
              )}
              <Badge variant="default">Seed: {currentTrack.seed}</Badge>
            </div>

            {/* Lyrics */}
            {!isInstrumental && currentTrack.lyrics && (
              <div className="w-full max-w-lg max-h-48 overflow-y-auto rounded-lg px-4 py-3 bg-[var(--bg-elevated)]">
                <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed">
                  {currentTrack.lyrics}
                </p>
              </div>
            )}
          </div>

          {/* Seek bar */}
          <div className="px-8 pb-2">
            <Slider
              min={0}
              max={Math.max(duration, 1)}
              step={0.1}
              value={[currentTime]}
              onValueChange={(v) => seek(v[0])}
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs tabular-nums text-[var(--text-muted)]">
                {formatDuration(currentTime)}
              </span>
              <span className="text-xs tabular-nums text-[var(--text-muted)]">
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* Transport controls */}
          <div className="flex items-center justify-center gap-6 pb-2">
            {/* Shuffle */}
            <button
              type="button"
              onClick={toggleShuffle}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                shuffleOn
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            {/* Previous */}
            <button
              type="button"
              onClick={prev}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <SkipBack className="w-6 h-6" fill="currentColor" />
            </button>

            {/* Play / Pause */}
            <button
              type="button"
              onClick={isPlaying ? pause : resume}
              className={clsx(
                'flex items-center justify-center w-14 h-14 rounded-full',
                'bg-[var(--accent)] hover:bg-[var(--accent-hover)]',
                'text-white transition-colors',
              )}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7" fill="currentColor" />
              ) : (
                <Play className="w-7 h-7 ml-0.5" fill="currentColor" />
              )}
            </button>

            {/* Next */}
            <button
              type="button"
              onClick={next}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <SkipForward className="w-6 h-6" fill="currentColor" />
            </button>

            {/* Repeat */}
            <button
              type="button"
              onClick={toggleRepeat}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                repeatMode !== 'none'
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              <RepeatIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Volume control */}
          <div className="flex items-center justify-center gap-3 px-8 pb-6">
            <button
              type="button"
              onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <div className="w-32">
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[volume]}
                onValueChange={(v) => setVolume(v[0])}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
