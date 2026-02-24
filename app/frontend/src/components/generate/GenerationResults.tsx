import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Play,
  Pause,
  Scissors,
  Download,
  Music,
  Pencil,
  Check,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { useGenerationStore } from '../../stores/useGenerationStore'
import { usePlayerStore } from '../../stores/usePlayerStore'
import { formatDuration } from '../../lib/utils'
import type { TrackInfo } from '../../types'

// ── Animated waveform bars ───────────────────────────────────────────────────

function MiniWaveform({
  peaks,
  progress = 0,
  isActive = false,
}: {
  peaks: number[] | null
  progress?: number
  isActive?: boolean
}) {
  const bars = useWaveformBars(peaks)

  return (
    <div className="flex items-end gap-[2px] h-12 w-full px-1">
      {bars.map((height, i) => {
        const barProgress = (i + 1) / bars.length
        const isPast = barProgress <= progress

        return (
          <div
            key={i}
            className={clsx(
              'flex-1 rounded-sm min-w-[2px]',
              'transition-colors',
              isPast
                ? 'bg-[var(--accent)]'
                : isActive
                  ? 'bg-[var(--accent)]/30'
                  : 'bg-[var(--waveform-wave)]',
            )}
            style={{
              height: `${Math.max(8, height * 100)}%`,
              transitionDuration: '150ms',
            }}
          />
        )
      })}
    </div>
  )
}

function useWaveformBars(peaks: number[] | null, targetBars = 40): number[] {
  const [bars] = useState(() => {
    if (!peaks || peaks.length === 0) {
      return Array.from({ length: targetBars }, () => 0.15 + Math.random() * 0.5)
    }

    const max = Math.max(...peaks, 0.01)
    const normalized = peaks.map((p) => Math.max(0.05, p / max))
    const step = Math.max(1, Math.floor(normalized.length / targetBars))
    const result: number[] = []

    for (let i = 0; i < normalized.length && result.length < targetBars; i += step) {
      const slice = normalized.slice(i, i + step)
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length
      result.push(avg)
    }

    return result
  })

  return bars
}

// ── Editable title ───────────────────────────────────────────────────────────

function EditableTitle({
  trackId,
  value,
  fallback,
}: {
  trackId: string
  value: string
  fallback: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const updateTitle = useGenerationStore((s) => s.updateTrackTitle)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const commit = useCallback(() => {
    const trimmed = draft.trim()
    updateTitle(trackId, trimmed)
    setIsEditing(false)
  }, [draft, trackId, updateTitle])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') {
      setDraft(value)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          placeholder="Track title..."
          className={clsx(
            'flex-1 min-w-0 h-7 px-2 text-sm font-semibold rounded-md',
            'bg-[var(--bg-elevated)] text-[var(--text-primary)]',
            'border border-[var(--accent)] focus:outline-none',
          )}
        />
        <button
          onClick={commit}
          className="p-1 rounded text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="group/title flex items-center gap-1.5 min-w-0 text-left"
    >
      <span className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">
        {value || fallback}
      </span>
      <Pencil className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
    </button>
  )
}

// ── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ track }: { track: TrackInfo }) {
  const play = usePlayerStore((s) => s.play)
  const pause = usePlayerStore((s) => s.pause)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const navigate = useNavigate()

  const isActive = currentTrack?.id === track.id
  const isThisPlaying = isActive && isPlaying
  const progress = isActive && duration > 0 ? currentTime / duration : 0

  const truncatedCaption =
    track.caption.length > 80
      ? track.caption.slice(0, 77) + '...'
      : track.caption

  const handlePlayPause = () => {
    if (isThisPlaying) {
      pause()
    } else {
      play(track)
    }
  }

  return (
    <div
      className={clsx(
        'group relative flex flex-col gap-3 p-4',
        'rounded-xl',
        'bg-[var(--bg-secondary)] border',
        'transition-all duration-200',
        isActive
          ? 'border-[var(--accent)]/40 shadow-[0_0_20px_rgba(124,58,237,0.15)]'
          : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:shadow-[var(--shadow)]',
      )}
    >
      {/* Playing indicator glow */}
      {isActive && (
        <div className="absolute inset-0 rounded-xl bg-[var(--accent)]/[0.03] pointer-events-none" />
      )}

      {/* Waveform + play overlay */}
      <div className="relative">
        <MiniWaveform peaks={track.peaks} progress={progress} isActive={isActive} />

        {/* Centered play/pause overlay */}
        <button
          onClick={handlePlayPause}
          className={clsx(
            'absolute inset-0 flex items-center justify-center',
            'bg-black/0 hover:bg-black/20 transition-colors rounded-lg',
            'opacity-0 group-hover:opacity-100',
            isThisPlaying && '!opacity-100',
          )}
        >
          <div
            className={clsx(
              'p-2.5 rounded-full',
              'bg-[var(--accent)] text-white shadow-lg',
              'hover:scale-105 active:scale-95 transition-transform',
            )}
          >
            {isThisPlaying ? (
              <Pause className="w-4 h-4" fill="currentColor" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
            )}
          </div>
        </button>
      </div>

      {/* Track info */}
      <div className="flex flex-col gap-2 min-w-0">
        <EditableTitle
          trackId={track.id}
          value={track.title}
          fallback={truncatedCaption || 'Untitled'}
        />

        {/* Caption (if different from title) */}
        {track.caption && track.title !== track.caption && (
          <p className="text-[11px] text-[var(--text-muted)] truncate leading-tight">
            {truncatedCaption}
          </p>
        )}

        {/* Metadata badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge>{formatDuration(track.duration)}</Badge>
          <Badge>seed: {track.seed}</Badge>
          <Badge variant="accent">{track.model_name}</Badge>
          {isActive && (
            <Badge variant="success">
              {isThisPlaying ? 'Playing' : 'Paused'}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant={isThisPlaying ? 'secondary' : 'primary'}
          size="sm"
          onClick={handlePlayPause}
          className="flex-1"
        >
          {isThisPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Play
            </>
          )}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            navigate('/stems', { state: { trackId: track.id, audioUrl: track.audio_url } })
          }
        >
          <Scissors className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const a = document.createElement('a')
            a.href = track.audio_url
            a.download = `${track.title || 'track'}.${track.audio_format}`
            a.click()
          }}
        >
          <Download className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Results container ────────────────────────────────────────────────────────

export default function GenerationResults() {
  const results = useGenerationStore((s) => s.results)

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)]">
          <Music className="w-7 h-7 text-[var(--text-muted)]" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            No tracks yet
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Generate your first track to see results here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">
          Results ({results.length})
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {results.map((track) => (
          <ResultCard key={track.id} track={track} />
        ))}
      </div>
    </div>
  )
}
