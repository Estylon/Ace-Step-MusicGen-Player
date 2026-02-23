import { useState } from 'react'
import { Zap, Target, GraduationCap, Loader2, ChevronDown, Check } from 'lucide-react'
import { useSettingsStore } from '../../stores/useSettingsStore'
import Badge from '../ui/Badge'
import clsx from 'clsx'

const MODEL_ICONS: Record<string, typeof Zap> = {
  turbo: Zap,
  base: Target,
  sft: GraduationCap,
}

const MODEL_LABELS: Record<string, string> = {
  turbo: 'Turbo',
  base: 'Base',
  sft: 'SFT',
}

export default function ModelSelector() {
  const modelStatus = useSettingsStore((s) => s.modelStatus)
  const loading = useSettingsStore((s) => s.loading)
  const loadModel = useSettingsStore((s) => s.loadModel)
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  const current = modelStatus?.current_model
  const available = modelStatus?.available_models ?? []

  const handleSwitch = async (name: string) => {
    if (name === current?.name || switching) return
    setSwitching(true)
    setOpen(false)
    try {
      await loadModel(name)
    } catch {
      // error handled in store
    } finally {
      setSwitching(false)
    }
  }

  const Icon = current ? (MODEL_ICONS[current.type] ?? Target) : Target

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={switching || loading}
        className={clsx(
          'flex items-center gap-2.5 w-full px-3 py-2 rounded-[var(--radius)]',
          'bg-[var(--bg-secondary)] border border-[var(--border)]',
          'hover:border-[var(--border-hover)] transition-colors duration-[var(--transition)]',
          'focus-visible:outline-none focus-visible:border-[var(--accent)] focus-visible:ring-1 focus-visible:ring-[var(--accent)]',
          (switching || loading) && 'opacity-60 cursor-wait',
        )}
      >
        {switching ? (
          <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
        ) : (
          <Icon className="w-4 h-4 text-[var(--accent-hover)]" />
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">
            {switching
              ? 'Switching model...'
              : current?.name ?? 'No model'}
          </span>
          {current && !switching && (
            <Badge variant="accent">{MODEL_LABELS[current.type] ?? current.type}</Badge>
          )}
        </div>
        <ChevronDown
          className={clsx(
            'w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div
            className={clsx(
              'absolute top-full left-0 right-0 mt-1 z-50',
              'bg-[var(--bg-elevated)] border border-[var(--border)]',
              'rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]',
              'py-1 overflow-hidden',
            )}
          >
            <div className="px-2 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Available Models
              </span>
            </div>
            {available.map((model) => {
              const MIcon = MODEL_ICONS[model.type] ?? Target
              const isLoaded = model.name === current?.name
              return (
                <button
                  key={model.name}
                  type="button"
                  onClick={() => handleSwitch(model.name)}
                  className={clsx(
                    'flex items-center gap-2.5 w-full px-3 py-2 text-left',
                    'hover:bg-[var(--accent-muted)] transition-colors',
                    isLoaded && 'bg-[var(--accent-muted)]/50',
                  )}
                >
                  <MIcon className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                  <span className="text-sm text-[var(--text-primary)] truncate flex-1">
                    {model.name}
                  </span>
                  <Badge variant={isLoaded ? 'accent' : 'default'}>
                    {MODEL_LABELS[model.type] ?? model.type}
                  </Badge>
                  {isLoaded && (
                    <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                  )}
                </button>
              )
            })}
            {available.length === 0 && (
              <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                No models found. Check Settings.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
