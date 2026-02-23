import { useState, useCallback } from 'react'
import {
  X,
  Play,
  Scissors,
  Trash2,
  Cpu,
  Zap,
  Hash,
  Clock,
  Music,
} from 'lucide-react'
import clsx from 'clsx'
import Button from '../ui/Button'
import { useLibraryStore } from '../../stores/useLibraryStore'
import { usePlayerStore } from '../../stores/usePlayerStore'
import { formatDuration, formatTimeAgo } from '../../lib/utils'

// ── Metadata row ─────────────────────────────────────────────────────────────

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock
  label: string
  value: string | number | null | undefined
}) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
      <span className="text-xs text-[var(--text-muted)] w-24 shrink-0">{label}</span>
      <span className="text-sm text-[var(--text-primary)] truncate">{String(value)}</span>
    </div>
  )
}

// ── Waveform ─────────────────────────────────────────────────────────────────

function FullWaveform({ peaks }: { peaks: number[] | null }) {
  const bars = peaks && peaks.length > 0
    ? peaks.map((p) => Math.max(8, Math.min(100, p * 100)))
    : Array.from({ length: 80 }, (_, i) => 15 + ((i * 13) % 70))

  return (
    <div className="flex items-end gap-px h-20 w-full">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-[var(--waveform-wave)] min-w-[1px]"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TrackDetail() {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const selectedTrack = useLibraryStore((s) => s.selectedTrack)
  const selectTrack = useLibraryStore((s) => s.selectTrack)
  const deleteTrack = useLibraryStore((s) => s.deleteTrack)
  const play = usePlayerStore((s) => s.play)

  const handleClose = useCallback(() => {
    selectTrack(null)
  }, [selectTrack])

  const handlePlay = useCallback(() => {
    if (selectedTrack) {
      play(selectedTrack)
    }
  }, [play, selectedTrack])

  const handleDelete = useCallback(async () => {
    if (!selectedTrack) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
      return
    }
    try {
      await deleteTrack(selectedTrack.id)
    } catch {
      // Error logged by store
    }
    setConfirmDelete(false)
  }, [confirmDelete, deleteTrack, selectedTrack])

  if (!selectedTrack) return null

  const track = selectedTrack

  // Parse params_json if possible
  let genParams: Record<string, unknown> = {}
  try {
    genParams = track.params_json ? JSON.parse(track.params_json) : {}
  } catch {
    // Ignore parse errors
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Slide-over panel */}
      <div
        className={clsx(
          'fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[480px]',
          'bg-[var(--bg-secondary)] border-l border-[var(--border)]',
          'shadow-[var(--shadow-lg)]',
          'flex flex-col',
          'animate-in slide-in-from-right',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] truncate pr-4">
            {track.title}
          </h2>
          <button
            onClick={handleClose}
            className={clsx(
              'p-2 rounded-[var(--radius)]',
              'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              'hover:bg-[var(--bg-hover)]',
              'transition-colors duration-[var(--transition)]',
            )}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          {/* Waveform */}
          <FullWaveform peaks={track.peaks} />

          {/* Play button */}
          <Button variant="primary" size="lg" onClick={handlePlay} className="w-full">
            <Play className="h-4 w-4" />
            Play Track
          </Button>

          {/* Caption */}
          {track.caption && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Caption
              </span>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {track.caption}
              </p>
            </div>
          )}

          {/* Lyrics */}
          {track.lyrics && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Lyrics
              </span>
              <pre className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap font-sans">
                {track.lyrics}
              </pre>
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Metadata
            </span>
            <div className="flex flex-col gap-1.5 p-3 rounded-[var(--radius)] bg-[var(--bg-primary)]">
              <MetaRow icon={Clock} label="Duration" value={formatDuration(track.duration)} />
              <MetaRow icon={Music} label="BPM" value={track.bpm} />
              <MetaRow icon={Hash} label="Key" value={track.keyscale} />
              <MetaRow icon={Music} label="Time Sig" value={track.timesignature} />
              <MetaRow icon={Music} label="Language" value={track.vocal_language} />
              <MetaRow icon={Cpu} label="Model" value={track.model_name} />
              <MetaRow icon={Zap} label="Adapter" value={track.adapter_name} />
              <MetaRow icon={Hash} label="Seed" value={track.seed} />
              <MetaRow icon={Music} label="Task" value={track.task_type} />
              <MetaRow icon={Music} label="Format" value={track.audio_format} />
              <MetaRow icon={Clock} label="Created" value={formatTimeAgo(track.created_at)} />
            </div>
          </div>

          {/* Generation params */}
          {Object.keys(genParams).length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Generation Parameters
              </span>
              <div className="flex flex-col gap-1 p-3 rounded-[var(--radius)] bg-[var(--bg-primary)]">
                {Object.entries(genParams).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)] font-mono w-40 shrink-0 truncate">
                      {key}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] truncate">
                      {String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-[var(--border)]">
          <Button size="sm" variant="secondary">
            <Scissors className="h-3.5 w-3.5" />
            Separate Stems
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            variant={confirmDelete ? 'danger' : 'ghost'}
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmDelete ? 'Confirm Delete' : 'Delete'}
          </Button>
        </div>
      </div>
    </>
  )
}
