import { useEffect, useState } from 'react'
import { Library, Search, ChevronLeft, ChevronRight, Heart, CheckSquare, Square, Download, X, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import Select from '../ui/Select'
import TrackCard from './TrackCard'
import TrackDetail from './TrackDetail'
import Skeleton from '../ui/Skeleton'
import { useLibraryStore } from '../../stores/useLibraryStore'
import { batchExport, downloadBlob } from '../../api/export'

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Newest first' },
  { value: 'title', label: 'Title A-Z' },
  { value: 'duration', label: 'Duration' },
  { value: 'bpm', label: 'BPM' },
  { value: 'rating', label: 'Rating' },
]

export default function LibraryPage() {
  const tracks = useLibraryStore((s) => s.tracks)
  const total = useLibraryStore((s) => s.total)
  const page = useLibraryStore((s) => s.page)
  const pageSize = useLibraryStore((s) => s.pageSize)
  const search = useLibraryStore((s) => s.search)
  const sort = useLibraryStore((s) => s.sort)
  const loading = useLibraryStore((s) => s.loading)
  const selectedTrack = useLibraryStore((s) => s.selectedTrack)
  const filterFavorites = useLibraryStore((s) => s.filterFavorites)
  const multiSelectMode = useLibraryStore((s) => s.multiSelectMode)
  const selectedIds = useLibraryStore((s) => s.selectedIds)
  const fetchTracks = useLibraryStore((s) => s.fetchTracks)
  const setSearch = useLibraryStore((s) => s.setSearch)
  const setSort = useLibraryStore((s) => s.setSort)
  const setPage = useLibraryStore((s) => s.setPage)
  const setFilterFavorites = useLibraryStore((s) => s.setFilterFavorites)
  const setMultiSelectMode = useLibraryStore((s) => s.setMultiSelectMode)
  const selectAll = useLibraryStore((s) => s.selectAll)
  const clearSelection = useLibraryStore((s) => s.clearSelection)

  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const selectedCount = selectedIds.size

  // Auto-fetch on mount
  useEffect(() => {
    fetchTracks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleExport = async () => {
    if (selectedCount === 0) return
    setExporting(true)
    setExportError(null)
    try {
      const blob = await batchExport({ trackIds: Array.from(selectedIds) })
      downloadBlob(blob, 'mastered_export.zip')
      // Success — exit multi-select mode
      setMultiSelectMode(false)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--accent-muted)]">
            <Library className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Library</h1>
            <p className="text-sm text-[var(--text-muted)]">
              {total} track{total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:ml-auto">
          {/* Multi-select toggle */}
          {tracks.length > 0 && (
            <button
              onClick={() => setMultiSelectMode(!multiSelectMode)}
              className={clsx(
                'flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius)] text-xs font-medium',
                'border transition-colors duration-[var(--transition)]',
                multiSelectMode
                  ? 'bg-[var(--accent-muted)] border-[var(--accent)] text-[var(--accent)]'
                  : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]',
              )}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Select
            </button>
          )}

          {/* Favorites filter toggle */}
          <button
            onClick={() => setFilterFavorites(!filterFavorites)}
            className={clsx(
              'flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius)] text-xs font-medium',
              'border transition-colors duration-[var(--transition)]',
              filterFavorites
                ? 'bg-[var(--accent-muted)] border-[var(--accent)] text-[var(--accent)]'
                : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]',
            )}
          >
            <Heart
              className="h-3.5 w-3.5"
              fill={filterFavorites ? 'currentColor' : 'none'}
            />
            Favorites
          </button>

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracks..."
              className={clsx(
                'h-9 w-full rounded-[var(--radius)] pl-9 pr-3 text-sm',
                'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
                'border border-[var(--border)]',
                'placeholder:text-[var(--text-muted)]',
                'transition-colors duration-[var(--transition)]',
                'hover:border-[var(--border-hover)]',
                'focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]',
              )}
            />
          </div>
          <Select
            options={SORT_OPTIONS}
            value={sort}
            onValueChange={setSort}
            className="w-40"
          />
        </div>
      </div>

      {/* Multi-select action bar */}
      {multiSelectMode && (
        <div
          className={clsx(
            'flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)]',
            'bg-[var(--bg-secondary)] border border-[var(--border)]',
          )}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => selectedCount === tracks.length ? clearSelection() : selectAll()}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius)] text-xs font-medium',
                'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                'hover:bg-[var(--bg-hover)] transition-colors',
              )}
            >
              {selectedCount === tracks.length ? (
                <CheckSquare className="h-3.5 w-3.5 text-[var(--accent)]" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              {selectedCount === tracks.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            {selectedCount} selected
          </span>

          <div className="flex-1" />

          {exportError && (
            <span className="text-xs text-[var(--error)]">{exportError}</span>
          )}

          <button
            onClick={handleExport}
            disabled={selectedCount === 0 || exporting}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium',
              'bg-[var(--accent)] text-white',
              'hover:bg-[var(--accent-hover)]',
              'disabled:opacity-40 disabled:pointer-events-none',
              'transition-colors',
            )}
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {exporting ? 'Mastering...' : 'Export WAV'}
          </button>

          <button
            onClick={() => setMultiSelectMode(false)}
            className={clsx(
              'p-1.5 rounded-[var(--radius)] text-[var(--text-muted)]',
              'hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
              'transition-colors',
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {loading && tracks.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Library className="h-12 w-12 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">
              {search ? 'No tracks match your search' : 'No tracks generated yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tracks.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-[var(--border)]">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className={clsx(
              'p-2 rounded-[var(--radius)]',
              'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              'hover:bg-[var(--bg-hover)]',
              'transition-colors duration-[var(--transition)]',
              'disabled:opacity-30 disabled:pointer-events-none',
            )}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-sm text-[var(--text-secondary)] tabular-nums px-3">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className={clsx(
              'p-2 rounded-[var(--radius)]',
              'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              'hover:bg-[var(--bg-hover)]',
              'transition-colors duration-[var(--transition)]',
              'disabled:opacity-30 disabled:pointer-events-none',
            )}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Track detail slide-over */}
      {selectedTrack && <TrackDetail />}
    </div>
  )
}
