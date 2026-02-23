import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Zap,
  Target,
  GraduationCap,
  ChevronDown,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import clsx from 'clsx'
import { useSettingsStore } from '../../stores/useSettingsStore'
import Badge from '../ui/Badge'
import type { ModelInfo } from '../../types'

// ── Model type config ────────────────────────────────────────────────────────

interface ModelTypeConfig {
  icon: typeof Zap
  color: string
  badgeBg: string
  badgeText: string
  summary: string
}

const MODEL_TYPE_CONFIG: Record<string, ModelTypeConfig> = {
  turbo: {
    icon: Zap,
    color: 'text-violet-400',
    badgeBg: 'bg-violet-500/20',
    badgeText: 'text-violet-300',
    summary: '8 steps, no CFG, fast',
  },
  base: {
    icon: Target,
    color: 'text-blue-400',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-300',
    summary: '50+ steps, full CFG, quality',
  },
  sft: {
    icon: GraduationCap,
    color: 'text-green-400',
    badgeBg: 'bg-green-500/20',
    badgeText: 'text-green-300',
    summary: 'Fine-tuned, enhanced tasks',
  },
  unknown: {
    icon: Target,
    color: 'text-[var(--text-muted)]',
    badgeBg: 'bg-[var(--bg-elevated)]',
    badgeText: 'text-[var(--text-secondary)]',
    summary: 'Custom checkpoint',
  },
}

function getModelConfig(type: string): ModelTypeConfig {
  return MODEL_TYPE_CONFIG[type] ?? MODEL_TYPE_CONFIG.unknown
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ModelSwitcher() {
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const modelStatus = useSettingsStore((s) => s.modelStatus)
  const loading = useSettingsStore((s) => s.loading)
  const loadModel = useSettingsStore((s) => s.loadModel)

  const currentModel = modelStatus?.current_model ?? null
  const availableModels = modelStatus?.available_models ?? []

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSwitch = useCallback(
    async (model: ModelInfo) => {
      if (model.loaded || switching) return
      setSwitching(true)
      try {
        await loadModel(model.name)
        setOpen(false)
      } catch {
        // Error is logged by the store
      } finally {
        setSwitching(false)
      }
    },
    [loadModel, switching],
  )

  const config = getModelConfig(currentModel?.type ?? 'unknown')
  const TypeIcon = config.icon
  const isBusy = loading || switching

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        disabled={isBusy}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 w-full',
          'rounded-[var(--radius)] text-sm',
          'bg-[var(--bg-secondary)] border border-[var(--border)]',
          'transition-all duration-[var(--transition)]',
          'hover:border-[var(--border-hover)] hover:bg-[var(--bg-tertiary)]',
          isBusy && 'opacity-60 cursor-wait',
        )}
      >
        {isBusy ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--accent)]" />
        ) : (
          <TypeIcon className={clsx('h-4 w-4 shrink-0', config.color)} />
        )}
        <span className="truncate text-[var(--text-primary)]">
          {currentModel?.name ?? 'No model loaded'}
        </span>
        {currentModel?.type && (
          <span
            className={clsx(
              'ml-auto mr-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded',
              config.badgeBg,
              config.badgeText,
            )}
          >
            {currentModel.type}
          </span>
        )}
        <ChevronDown
          className={clsx(
            'h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]',
            'transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={clsx(
            'absolute top-full left-0 right-0 z-50 mt-1',
            'rounded-[var(--radius-lg)] border border-[var(--border)]',
            'bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]',
            'overflow-hidden',
            'animate-in fade-in-0 zoom-in-95',
          )}
        >
          {/* Warning */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--warning-muted)]">
            <AlertTriangle className="h-3.5 w-3.5 text-[var(--warning)] shrink-0" />
            <span className="text-xs text-[var(--warning)]">
              Switching model will unload current adapter
            </span>
          </div>

          {/* Model list */}
          <div className="max-h-72 overflow-y-auto p-1">
            {availableModels.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
                No models available
              </div>
            )}
            {availableModels.map((model) => {
              const mc = getModelConfig(model.type)
              const Icon = mc.icon
              const isLoaded = model.loaded

              return (
                <button
                  key={model.name}
                  onClick={() => handleSwitch(model)}
                  disabled={isLoaded || isBusy}
                  className={clsx(
                    'flex items-start gap-3 w-full p-3 rounded-[var(--radius)]',
                    'text-left transition-colors duration-[var(--transition)]',
                    isLoaded
                      ? 'bg-[var(--accent-muted)] cursor-default'
                      : 'hover:bg-[var(--bg-hover)] cursor-pointer',
                    isBusy && !isLoaded && 'opacity-40 pointer-events-none',
                  )}
                >
                  <Icon className={clsx('h-5 w-5 mt-0.5 shrink-0', mc.color)} />
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {model.name}
                      </span>
                      <span
                        className={clsx(
                          'px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded',
                          mc.badgeBg,
                          mc.badgeText,
                        )}
                      >
                        {model.type}
                      </span>
                      {isLoaded && (
                        <Badge variant="success" className="ml-auto">
                          <Check className="h-3 w-3 mr-0.5" />
                          Loaded
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{mc.summary}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
