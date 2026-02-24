import { useState, useEffect } from 'react'
import {
  Plug,
  Loader2,
  ChevronDown,
  Check,
  X,
  Power,
  Lock,
  Tag,
} from 'lucide-react'
import { useSettingsStore } from '../../stores/useSettingsStore'
import Badge from '../ui/Badge'
import Slider from '../ui/Slider'
import clsx from 'clsx'

export default function AdapterSelector() {
  const adapterList = useSettingsStore((s) => s.adapterList)
  const loading = useSettingsStore((s) => s.loading)
  const loadAdapter = useSettingsStore((s) => s.loadAdapter)
  const unloadAdapter = useSettingsStore((s) => s.unloadAdapter)
  const updateAdapterConfig = useSettingsStore((s) => s.updateAdapterConfig)
  const fetchAdapterList = useSettingsStore((s) => s.fetchAdapterList)
  const modelStatus = useSettingsStore((s) => s.modelStatus)
  const adapterStyleTags = useSettingsStore((s) => s.adapterStyleTags)
  const setAdapterStyleTag = useSettingsStore((s) => s.setAdapterStyleTag)

  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch adapters when component mounts or model changes
  useEffect(() => {
    if (modelStatus?.initialized) {
      fetchAdapterList()
    }
  }, [modelStatus?.current_model?.name, modelStatus?.initialized, fetchAdapterList])

  const current = adapterList?.current
  const adapters = adapterList?.adapters ?? []
  const isLoaded = current?.loaded ?? false

  const compatible = adapters.filter((a) => a.compatible_with_current)
  const incompatible = adapters.filter((a) => !a.compatible_with_current)

  const handleLoad = async (path: string) => {
    if (busy) return
    setBusy(true)
    setOpen(false)
    setError(null)
    try {
      await loadAdapter(path, 1.0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load adapter')
    } finally {
      setBusy(false)
    }
  }

  const handleUnload = async () => {
    if (busy) return
    setBusy(true)
    try {
      await unloadAdapter()
    } catch {
      // handled in store
    } finally {
      setBusy(false)
    }
  }

  const handleToggleActive = async () => {
    if (!current || busy) return
    try {
      await updateAdapterConfig(!current.active, undefined)
    } catch {
      // handled in store
    }
  }

  const handleScaleChange = async (value: number[]) => {
    if (!current) return
    try {
      await updateAdapterConfig(undefined, value[0])
    } catch {
      // handled in store
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Selector trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={busy || loading}
          className={clsx(
            'flex items-center gap-2.5 w-full px-3 py-2 rounded-[var(--radius)]',
            'bg-[var(--bg-secondary)] border border-[var(--border)]',
            'hover:border-[var(--border-hover)] transition-colors duration-[var(--transition)]',
            'focus-visible:outline-none focus-visible:border-[var(--accent)] focus-visible:ring-1 focus-visible:ring-[var(--accent)]',
            (busy || loading) && 'opacity-60 cursor-wait',
          )}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
          ) : (
            <Plug className={clsx('w-4 h-4', isLoaded ? 'text-[var(--success)]' : 'text-[var(--text-muted)]')} />
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {busy
                ? 'Loading adapter...'
                : isLoaded
                  ? current!.name
                  : 'No adapter'}
            </span>
            {isLoaded && !busy && (
              <Badge variant={current!.active ? 'success' : 'default'}>
                {current!.type.toUpperCase()}
              </Badge>
            )}
          </div>
          {isLoaded && !busy && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleUnload()
              }}
              className="p-0.5 rounded hover:bg-[var(--error-muted)] text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
              title="Unload adapter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <div
              className={clsx(
                'absolute top-full left-0 right-0 mt-1 z-50',
                'bg-[var(--bg-elevated)] border border-[var(--border)]',
                'rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]',
                'py-1 max-h-72 overflow-y-auto',
              )}
            >
              {/* Compatible adapters */}
              {compatible.length > 0 && (
                <>
                  <div className="px-2 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Compatible
                    </span>
                  </div>
                  {compatible.map((adapter) => {
                    const isCurrent = isLoaded && current?.path === adapter.path
                    return (
                      <button
                        key={adapter.path}
                        type="button"
                        onClick={() => handleLoad(adapter.path)}
                        className={clsx(
                          'flex items-center gap-2.5 w-full px-3 py-2 text-left',
                          'hover:bg-[var(--accent-muted)] transition-colors',
                          isCurrent && 'bg-[var(--accent-muted)]/50',
                        )}
                      >
                        <span className="text-sm text-[var(--text-primary)] truncate flex-1">
                          {adapter.name}
                        </span>
                        <Badge variant="default">
                          {adapter.type.toUpperCase()}
                          {adapter.rank ? ` r${adapter.rank}` : ''}
                        </Badge>
                        {isCurrent && (
                          <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </>
              )}

              {/* Incompatible adapters */}
              {incompatible.length > 0 && (
                <>
                  <div className="px-2 py-1.5 mt-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Requires Different Model
                    </span>
                  </div>
                  {incompatible.map((adapter) => (
                    <div
                      key={adapter.path}
                      className="flex items-center gap-2.5 w-full px-3 py-2 opacity-50 cursor-not-allowed"
                    >
                      <Lock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                      <span className="text-sm text-[var(--text-secondary)] truncate flex-1">
                        {adapter.name}
                      </span>
                      <Badge variant="default">
                        {adapter.base_model}
                      </Badge>
                    </div>
                  ))}
                </>
              )}

              {adapters.length === 0 && (
                <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                  No adapters found. Add LoRA search paths in Settings.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Error message */}
      {error && !busy && (
        <p className="text-xs text-[var(--error)] px-1">{error}</p>
      )}

      {/* Loaded adapter controls */}
      {isLoaded && current && !busy && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 pl-1">
            {/* Active toggle */}
            <button
              type="button"
              onClick={handleToggleActive}
              className={clsx(
                'flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] text-xs font-medium transition-colors',
                current.active
                  ? 'bg-[var(--success-muted)] text-[var(--success)]'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
              )}
              title={current.active ? 'Click to deactivate' : 'Click to activate'}
            >
              <Power className="w-3 h-3" />
              {current.active ? 'ON' : 'OFF'}
            </button>

            {/* Scale slider */}
            <div className="flex-1 min-w-0">
              <Slider
                label="Scale"
                min={0}
                max={2}
                step={0.05}
                value={[current.scale]}
                onValueChange={handleScaleChange}
                formatValue={(v) => v.toFixed(2)}
              />
            </div>
          </div>

          {/* Style tag (trigger word) */}
          <div className="flex items-center gap-2 pl-1">
            <Tag className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
            <input
              type="text"
              placeholder="Style tag / trigger word..."
              value={adapterStyleTags[current.path] ?? ''}
              onChange={(e) => setAdapterStyleTag(current.path, e.target.value)}
              className={clsx(
                'flex-1 min-w-0 h-7 px-2 text-xs rounded-[var(--radius-sm)]',
                'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
                'border border-[var(--border)]',
                'placeholder:text-[var(--text-muted)]',
                'transition-colors duration-[var(--transition)]',
                'hover:border-[var(--border-hover)]',
                'focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]',
              )}
            />
            {(adapterStyleTags[current.path] ?? '').trim() && (
              <Badge variant="accent" className="shrink-0">
                prepend
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
