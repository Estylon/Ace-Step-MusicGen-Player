import { Mic, Layers, Sparkles, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import Button from '../ui/Button'
import Card from '../ui/Card'
import ProgressRing from '../ui/ProgressRing'
import { useStemStore } from '../../stores/useStemStore'

// ── Mode definitions ─────────────────────────────────────────────────────────

interface ModeOption {
  id: 'vocals' | 'multi' | 'two-pass'
  title: string
  engine: string
  sdr: string
  speed: string
  description: string
  icon: typeof Mic
}

const MODES: ModeOption[] = [
  {
    id: 'vocals',
    title: '2-Stem (Vocals)',
    engine: 'BS-RoFormer',
    sdr: 'SDR 12.97',
    speed: 'fastest',
    description: 'Best vocal isolation',
    icon: Mic,
  },
  {
    id: 'multi',
    title: '4-Stem (Full)',
    engine: 'Demucs',
    sdr: 'SDR 9.2',
    speed: 'moderate',
    description: 'Vocals, drums, bass, other',
    icon: Layers,
  },
  {
    id: 'two-pass',
    title: 'Two-Pass (Best)',
    engine: 'RoFormer + Demucs',
    sdr: 'Best quality',
    speed: 'slowest',
    description: 'Best vocals + multi-stem',
    icon: Sparkles,
  },
]

// ── Component ────────────────────────────────────────────────────────────────

export default function StemModelSelector() {
  const sourceTrack = useStemStore((s) => s.sourceTrack)
  const mode = useStemStore((s) => s.mode)
  const setMode = useStemStore((s) => s.setMode)
  const activeJob = useStemStore((s) => s.activeJob)
  const separate = useStemStore((s) => s.separate)

  const isProcessing = activeJob !== null
  const canSeparate = sourceTrack !== null && !isProcessing

  const handleSeparate = async () => {
    try {
      await separate()
    } catch {
      // Error is logged by the store
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          Separation Mode
        </span>

        {/* Mode cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODES.map((opt) => {
            const selected = mode === opt.id
            const Icon = opt.icon

            return (
              <button
                key={opt.id}
                onClick={() => setMode(opt.id)}
                disabled={isProcessing}
                className={clsx(
                  'flex flex-col items-start gap-2 p-4 rounded-[var(--radius-lg)]',
                  'border-2 text-left',
                  'transition-all duration-[var(--transition)]',
                  selected
                    ? 'border-[var(--accent)] bg-[var(--accent-muted)] shadow-[var(--accent-glow)]'
                    : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-tertiary)]',
                  isProcessing && !selected && 'opacity-40 pointer-events-none',
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={clsx(
                      'h-4 w-4',
                      selected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
                    )}
                  />
                  <span
                    className={clsx(
                      'text-sm font-semibold',
                      selected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                    )}
                  >
                    {opt.title}
                  </span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">{opt.engine}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={clsx(
                      'text-[10px] font-mono px-1.5 py-0.5 rounded',
                      selected
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
                    )}
                  >
                    {opt.sdr}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">{opt.speed}</span>
                </div>
                <span className="text-xs text-[var(--text-muted)] mt-1">{opt.description}</span>
              </button>
            )
          })}
        </div>

        {/* Separate button + progress */}
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSeparate}
            disabled={!canSeparate}
            loading={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Separating...
              </>
            ) : (
              'Separate Stems'
            )}
          </Button>

          {isProcessing && (
            <ProgressRing progress={50} size={36} strokeWidth={3} />
          )}
        </div>

        {!sourceTrack && (
          <p className="text-xs text-[var(--text-muted)] text-center">
            Upload or select a track above to begin separation
          </p>
        )}
      </div>
    </Card>
  )
}
