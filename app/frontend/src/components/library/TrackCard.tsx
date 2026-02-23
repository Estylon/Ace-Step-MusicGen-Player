import { useState, useCallback } from 'react'
import { Play, Scissors, Trash2, Zap, Cpu } from 'lucide-react'
import clsx from 'clsx'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { usePlayerStore } from '../../stores/usePlayerStore'
import { useLibraryStore } from '../../stores/useLibraryStore'
import { formatDuration, formatTimeAgo } from '../../lib/utils'
import type { TrackInfo } from '../../types'

// ── Mini waveform from peaks ─────────────────────────────────────────────────

function MiniWaveform({ peaks }: { peaks: number[] | null }) {
  // Use peaks data or generate placeholder bars
  const bars = peaks && peaks.length > 0
    ? peaks.slice(0, 40).map((p) => Math.max(10, Math.min(100, p * 100)))
    : Array.from({ length: 40 }, (_, i) => 15 + ((i * 17) % 60))

  return (
    <div className="flex items-end gap-px h-12 w-full px-1">
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

interface TrackCardProps {
  track: TrackInfo
}

export default function TrackCard({ track }: TrackCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const play = usePlayerStore((s) => s.play)
  const selectTrack = useLibraryStore((s) => s.selectTrack)
  const deleteTrack = useLibraryStore((s) => s.deleteTrack)

  const handlePlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      play(track)
    },
    [play, track],
  )

  const handleStems = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      // Navigate to stems page -- in a real app this would use react-router navigate
      // For now, we can use the select to show details
      selectTrack(track.id)
    },
    [selectTrack, track.id],
  )

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!confirmDelete) {
        setConfirmDelete(true)
        // Auto-dismiss after 3 seconds
        setTimeout(() => setConfirmDelete(false), 3000)
        return
      }
      try {
        await deleteTrack(track.id)
      } catch {
        // Error logged by store
      }
      setConfirmDelete(false)
    },
    [confirmDelete, deleteTrack, track.id],
  )

  const handleCardClick = useCallback(() => {
    selectTrack(track.id)
  }, [selectTrack, track.id])

  return (
    <Card hover className="cursor-pointer" >
      <div onClick={handleCardClick} className="flex flex-col gap-3">
        {/* Waveform */}
        <MiniWaveform peaks={track.peaks} />

        {/* Title */}
        <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">
          {track.title}
        </h3>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {track.duration > 0 && (
            <Badge>{formatDuration(track.duration)}</Badge>
          )}
          {track.bpm != null && track.bpm > 0 && (
            <Badge>{track.bpm} BPM</Badge>
          )}
          {track.keyscale && (
            <Badge>{track.keyscale}</Badge>
          )}
        </div>

        {/* Model + adapter badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {track.model_name && (
            <Badge variant="accent">
              <Cpu className="h-3 w-3 mr-0.5" />
              {track.model_name}
            </Badge>
          )}
          {track.adapter_name && (
            <Badge variant="default">
              <Zap className="h-3 w-3 mr-0.5" />
              {track.adapter_name}
            </Badge>
          )}
        </div>

        {/* Created date */}
        <span className="text-xs text-[var(--text-muted)]">
          {formatTimeAgo(track.created_at)}
        </span>

        {/* Actions */}
        <div
          className="flex items-center gap-1 pt-2 border-t border-[var(--border)]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handlePlay}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium',
              'bg-[var(--accent)] text-white',
              'hover:bg-[var(--accent-hover)]',
              'transition-colors duration-[var(--transition)]',
            )}
          >
            <Play className="h-3 w-3" />
            Play
          </button>

          <button
            onClick={handleStems}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium',
              'text-[var(--text-secondary)]',
              'hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
              'transition-colors duration-[var(--transition)]',
            )}
          >
            <Scissors className="h-3 w-3" />
            Stems
          </button>

          <div className="flex-1" />

          <button
            onClick={handleDelete}
            className={clsx(
              'flex items-center gap-1 px-2 py-1.5 rounded-[var(--radius-sm)] text-xs',
              'transition-colors duration-[var(--transition)]',
              confirmDelete
                ? 'bg-[var(--error-muted)] text-[var(--error)]'
                : 'text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error-muted)]',
            )}
          >
            <Trash2 className="h-3 w-3" />
            {confirmDelete ? 'Confirm?' : ''}
          </button>
        </div>
      </div>
    </Card>
  )
}
