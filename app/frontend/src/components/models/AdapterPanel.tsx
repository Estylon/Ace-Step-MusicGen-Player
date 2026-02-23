import { useState, useCallback } from 'react'
import {
  FolderSearch,
  RefreshCw,
  Zap,
  Power,
  Trash2,
  ArrowRightLeft,
} from 'lucide-react'
import * as RadixSwitch from '@radix-ui/react-switch'
import clsx from 'clsx'
import Collapsible from '../ui/Collapsible'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Slider from '../ui/Slider'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { scanAdapters, addSearchPath } from '../../api/models'
import type { AdapterInfo } from '../../types'

// ── Sub-components ───────────────────────────────────────────────────────────

function AdapterTypeBadge({ type }: { type: string }) {
  const isLora = type.toLowerCase() === 'lora'
  return (
    <Badge variant={isLora ? 'accent' : 'default'}>
      {isLora ? 'LoRA' : 'LoKr'}
    </Badge>
  )
}

function RankBadge({ rank }: { rank: number | null }) {
  if (rank == null) return null
  return (
    <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[var(--bg-elevated)] text-[var(--text-muted)]">
      r{rank}
    </span>
  )
}

function BaseModelBadge({ model }: { model: string }) {
  const colors: Record<string, string> = {
    turbo: 'text-violet-300 bg-violet-500/20',
    base: 'text-blue-300 bg-blue-500/20',
    sft: 'text-green-300 bg-green-500/20',
  }
  const cls = colors[model] ?? 'text-[var(--text-muted)] bg-[var(--bg-elevated)]'
  return (
    <span className={clsx('px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded', cls)}>
      {model}
    </span>
  )
}

// ── Adapter card ─────────────────────────────────────────────────────────────

interface AdapterCardProps {
  adapter: AdapterInfo
  compatible: boolean
  loading: boolean
  onLoad: () => void
  onSwitchAndLoad: () => void
}

function AdapterCard({ adapter, compatible, loading, onLoad, onSwitchAndLoad }: AdapterCardProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-3 rounded-[var(--radius)]',
        'bg-[var(--bg-secondary)] border border-[var(--border)]',
        'transition-colors duration-[var(--transition)]',
        'hover:border-[var(--border-hover)]',
      )}
    >
      <Zap className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-sm font-medium text-[var(--text-primary)] truncate">
          {adapter.name}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <AdapterTypeBadge type={adapter.type} />
          <RankBadge rank={adapter.rank} />
          {!compatible && <BaseModelBadge model={adapter.base_model} />}
        </div>
      </div>
      {compatible ? (
        <Button size="sm" variant="secondary" onClick={onLoad} loading={loading}>
          Load
        </Button>
      ) : (
        <Button size="sm" variant="secondary" onClick={onSwitchAndLoad} loading={loading}>
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Switch & Load
        </Button>
      )}
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

export default function AdapterPanel() {
  const [scanning, setScanning] = useState(false)
  const [loadingAdapter, setLoadingAdapter] = useState<string | null>(null)

  const adapterList = useSettingsStore((s) => s.adapterList)
  const loading = useSettingsStore((s) => s.loading)
  const loadModel = useSettingsStore((s) => s.loadModel)
  const loadAdapter = useSettingsStore((s) => s.loadAdapter)
  const unloadAdapter = useSettingsStore((s) => s.unloadAdapter)
  const updateAdapterConfig = useSettingsStore((s) => s.updateAdapterConfig)
  const fetchAdapterList = useSettingsStore((s) => s.fetchAdapterList)

  const adapters = adapterList?.adapters ?? []
  const current = adapterList?.current ?? null
  const isLoaded = current?.loaded ?? false

  const compatible = adapters.filter((a) => a.compatible_with_current)
  const incompatible = adapters.filter((a) => !a.compatible_with_current)

  const handleBrowseFolder = useCallback(async () => {
    const folder = prompt('Enter adapter folder path:')
    if (!folder) return
    try {
      await addSearchPath(folder)
      await fetchAdapterList()
    } catch {
      // Error logged by API
    }
  }, [fetchAdapterList])

  const handleScan = useCallback(async () => {
    setScanning(true)
    try {
      await scanAdapters()
      await fetchAdapterList()
    } catch {
      // Error logged by API
    } finally {
      setScanning(false)
    }
  }, [fetchAdapterList])

  const handleLoad = useCallback(
    async (adapter: AdapterInfo) => {
      setLoadingAdapter(adapter.name)
      try {
        await loadAdapter(adapter.path, 1.0)
      } catch {
        // Error logged by store
      } finally {
        setLoadingAdapter(null)
      }
    },
    [loadAdapter],
  )

  const handleSwitchAndLoad = useCallback(
    async (adapter: AdapterInfo) => {
      setLoadingAdapter(adapter.name)
      try {
        await loadModel(adapter.base_model)
        await loadAdapter(adapter.path, 1.0)
      } catch {
        // Error logged by store
      } finally {
        setLoadingAdapter(null)
      }
    },
    [loadModel, loadAdapter],
  )

  const handleUnload = useCallback(async () => {
    try {
      await unloadAdapter()
    } catch {
      // Error logged by store
    }
  }, [unloadAdapter])

  const handleToggleActive = useCallback(
    async (active: boolean) => {
      try {
        await updateAdapterConfig(active)
      } catch {
        // Error logged by store
      }
    },
    [updateAdapterConfig],
  )

  const handleScaleChange = useCallback(
    async (values: number[]) => {
      try {
        await updateAdapterConfig(undefined, values[0])
      } catch {
        // Error logged by store
      }
    },
    [updateAdapterConfig],
  )

  return (
    <Collapsible title="LoRA / LoKr Adapter" defaultOpen={false}>
      <div className="flex flex-col gap-3">
        {/* Top actions */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleBrowseFolder}>
            <FolderSearch className="h-3.5 w-3.5" />
            Browse Folder
          </Button>
          <Button size="sm" variant="ghost" onClick={handleScan} loading={scanning}>
            <RefreshCw className={clsx('h-3.5 w-3.5', scanning && 'animate-spin')} />
            Scan
          </Button>
        </div>

        {/* Empty state */}
        {adapters.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Zap className="h-8 w-8 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">
              No adapters found. Add a folder to scan.
            </p>
          </div>
        )}

        {/* Compatible adapters */}
        {compatible.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Compatible
            </span>
            {compatible.map((adapter) => (
              <AdapterCard
                key={adapter.name}
                adapter={adapter}
                compatible
                loading={loadingAdapter === adapter.name || loading}
                onLoad={() => handleLoad(adapter)}
                onSwitchAndLoad={() => {}}
              />
            ))}
          </div>
        )}

        {/* Incompatible adapters */}
        {incompatible.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Requires Model Switch
            </span>
            {incompatible.map((adapter) => (
              <AdapterCard
                key={adapter.name}
                adapter={adapter}
                compatible={false}
                loading={loadingAdapter === adapter.name || loading}
                onLoad={() => {}}
                onSwitchAndLoad={() => handleSwitchAndLoad(adapter)}
              />
            ))}
          </div>
        )}

        {/* Loaded adapter controls */}
        {isLoaded && current && (
          <div
            className={clsx(
              'flex flex-col gap-3 p-3 mt-1 rounded-[var(--radius-lg)]',
              'border border-[var(--accent)] bg-[var(--accent-muted)]',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Power className="h-4 w-4 text-[var(--accent)] shrink-0" />
                <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {current.name}
                </span>
                <AdapterTypeBadge type={current.type} />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Active</span>
              <RadixSwitch.Root
                checked={current.active}
                onCheckedChange={handleToggleActive}
                className={clsx(
                  'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full',
                  'transition-colors duration-200',
                  current.active ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)]',
                )}
              >
                <RadixSwitch.Thumb
                  className={clsx(
                    'block h-4 w-4 rounded-full bg-white shadow-sm',
                    'transition-transform duration-200',
                    current.active ? 'translate-x-[18px]' : 'translate-x-[2px]',
                  )}
                />
              </RadixSwitch.Root>
            </div>

            {/* Scale slider */}
            <Slider
              label="Scale"
              min={0}
              max={2}
              step={0.05}
              value={[current.scale]}
              onValueChange={handleScaleChange}
              formatValue={(v) => v.toFixed(2)}
            />

            {/* Unload button */}
            <Button
              size="sm"
              variant="danger"
              onClick={handleUnload}
              loading={loading}
              className="self-start"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Unload
            </Button>
          </div>
        )}
      </div>
    </Collapsible>
  )
}
