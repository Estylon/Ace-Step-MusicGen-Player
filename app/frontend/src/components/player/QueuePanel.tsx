import { AnimatePresence, motion } from 'framer-motion'
import { X, ListMusic, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { usePlayerStore } from '../../stores/usePlayerStore'
import { formatDuration } from '../../lib/utils'

interface QueuePanelProps {
  open: boolean
  onClose: () => void
}

export default function QueuePanel({ open, onClose }: QueuePanelProps) {
  const queue = usePlayerStore((s) => s.queue)
  const queueIndex = usePlayerStore((s) => s.queueIndex)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const play = usePlayerStore((s) => s.play)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)
  const clearQueue = usePlayerStore((s) => s.clearQueue)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            key="queue-overlay"
            className="fixed inset-0 z-[55] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="queue-panel"
            className={clsx(
              'fixed top-0 right-0 z-[56] w-80 h-[calc(100%-var(--player-bar-height,72px))]',
              'flex flex-col',
              'bg-[var(--bg-secondary)] border-l border-[var(--border)]',
              'shadow-xl',
            )}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-[var(--text-secondary)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Queue
                </h2>
                <span className="text-xs text-[var(--text-muted)] tabular-nums">
                  ({queue.length})
                </span>
              </div>
              <div className="flex items-center gap-1">
                {queue.length > 0 && (
                  <button
                    type="button"
                    onClick={clearQueue}
                    className={clsx(
                      'flex items-center gap-1 px-2 py-1 rounded text-xs',
                      'text-[var(--text-muted)] hover:text-[var(--error)]',
                      'hover:bg-[var(--bg-elevated)] transition-colors',
                    )}
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className={clsx(
                    'p-1 rounded',
                    'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                    'hover:bg-[var(--bg-elevated)] transition-colors',
                  )}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Track list */}
            <div className="flex-1 overflow-y-auto">
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--text-muted)]">
                  <ListMusic className="w-8 h-8 opacity-40" />
                  <p className="text-sm">Queue is empty</p>
                </div>
              ) : (
                <ul className="py-1">
                  {queue.map((track, index) => {
                    const isCurrent =
                      currentTrack?.id === track.id && index === queueIndex

                    return (
                      <li
                        key={`${track.id}-${index}`}
                        className={clsx(
                          'group flex items-center gap-2 px-3 py-2 cursor-pointer',
                          'hover:bg-[var(--bg-elevated)] transition-colors',
                          isCurrent && 'bg-[var(--accent-muted)]',
                        )}
                        onClick={() => play(track)}
                      >
                        {/* Index number */}
                        <span
                          className={clsx(
                            'w-6 text-right text-xs tabular-nums shrink-0',
                            isCurrent
                              ? 'text-[var(--accent)] font-semibold'
                              : 'text-[var(--text-muted)]',
                          )}
                        >
                          {index + 1}
                        </span>

                        {/* Track info */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={clsx(
                              'text-sm truncate',
                              isCurrent
                                ? 'text-[var(--accent)] font-medium'
                                : 'text-[var(--text-primary)]',
                            )}
                          >
                            {track.title || 'Untitled'}
                          </p>
                          {isCurrent && (
                            <p className="text-[10px] text-[var(--accent)] font-medium mt-0.5">
                              Now Playing
                            </p>
                          )}
                        </div>

                        {/* Duration */}
                        <span className="text-xs tabular-nums text-[var(--text-muted)] shrink-0">
                          {formatDuration(track.duration)}
                        </span>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFromQueue(index)
                          }}
                          className={clsx(
                            'p-0.5 rounded opacity-0 group-hover:opacity-100',
                            'text-[var(--text-muted)] hover:text-[var(--error)]',
                            'hover:bg-[var(--bg-elevated)] transition-all shrink-0',
                          )}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
