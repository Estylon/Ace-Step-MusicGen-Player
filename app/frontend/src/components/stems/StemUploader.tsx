import { useState, useCallback } from 'react'
import { Music, ArrowRight, X } from 'lucide-react'
import clsx from 'clsx'
import DropZone from '../ui/DropZone'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { useStemStore } from '../../stores/useStemStore'
import { useLibraryStore } from '../../stores/useLibraryStore'
import type { TrackInfo } from '../../types'
import { formatDuration } from '../../lib/utils'

export default function StemUploader() {
  const [showLibrary, setShowLibrary] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const sourceTrack = useStemStore((s) => s.sourceTrack)
  const setSource = useStemStore((s) => s.setSource)

  const libraryTracks = useLibraryStore((s) => s.tracks)
  const fetchTracks = useLibraryStore((s) => s.fetchTracks)

  const handleFileDrop = useCallback(
    (files: File[]) => {
      const file = files[0]
      if (!file) return
      // For now, use the file name as the source identifier.
      // In a real implementation this would upload the file and get a server path.
      setFileName(file.name)
      setSource(file.name)
      setShowLibrary(false)
    },
    [setSource],
  )

  const handleSelectFromLibrary = useCallback(async () => {
    // Fetch the latest tracks if none loaded
    if (libraryTracks.length === 0) {
      await fetchTracks()
    }
    setShowLibrary(true)
  }, [libraryTracks.length, fetchTracks])

  const handlePickTrack = useCallback(
    (track: TrackInfo) => {
      setFileName(track.title)
      setSource(track.audio_path)
      setShowLibrary(false)
    },
    [setSource],
  )

  const handleClear = useCallback(() => {
    setFileName(null)
    setSource(null)
    setShowLibrary(false)
  }, [setSource])

  // Source is set -- show compact info
  if (sourceTrack) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-[var(--radius)] bg-[var(--bg-elevated)] shrink-0">
            <Music className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {fileName || sourceTrack}
            </span>
            <span className="text-xs text-[var(--text-muted)]">Source audio</span>
          </div>
          <Button size="sm" variant="ghost" onClick={handleClear}>
            <X className="h-3.5 w-3.5" />
            Change
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <DropZone
          onDrop={handleFileDrop}
          accept="audio/*"
          label="Drop an audio file here or click to browse"
        />

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <Button size="md" variant="secondary" onClick={handleSelectFromLibrary}>
          <Music className="h-4 w-4" />
          Select from Library
          <ArrowRight className="h-3.5 w-3.5 ml-auto" />
        </Button>

        {/* Quick library picker */}
        {showLibrary && (
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] p-1">
            {libraryTracks.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-[var(--text-muted)]">
                No tracks in library
              </div>
            )}
            {libraryTracks.slice(0, 20).map((track) => (
              <button
                key={track.id}
                onClick={() => handlePickTrack(track)}
                className={clsx(
                  'flex items-center gap-3 w-full px-3 py-2 rounded-[var(--radius-sm)]',
                  'text-left text-sm',
                  'hover:bg-[var(--bg-hover)]',
                  'transition-colors duration-[var(--transition)]',
                )}
              >
                <Music className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                <span className="text-[var(--text-primary)] truncate flex-1">{track.title}</span>
                <span className="text-xs text-[var(--text-muted)] tabular-nums shrink-0">
                  {formatDuration(track.duration)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
