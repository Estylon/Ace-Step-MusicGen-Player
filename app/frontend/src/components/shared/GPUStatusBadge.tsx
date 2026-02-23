import { HardDrive } from 'lucide-react'
import clsx from 'clsx'
import { useSettingsStore } from '../../stores/useSettingsStore'

export default function GPUStatusBadge() {
  const modelStatus = useSettingsStore((s) => s.modelStatus)
  const gpu = modelStatus?.gpu

  const vramFree = gpu?.vram_free_gb ?? 0
  const vramTotal = gpu?.vram_total_gb ?? 0
  const vramUsed = vramTotal > 0 ? vramTotal - vramFree : 0
  const vramFreePercent = vramTotal > 0 ? (vramFree / vramTotal) * 100 : 100

  const colorClass =
    vramFreePercent > 50
      ? 'text-[var(--success)]'
      : vramFreePercent > 25
        ? 'text-[var(--warning)]'
        : 'text-[var(--error)]'

  const bgClass =
    vramFreePercent > 50
      ? 'bg-[var(--success-muted)]'
      : vramFreePercent > 25
        ? 'bg-[var(--warning-muted)]'
        : 'bg-[var(--error-muted)]'

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1',
        'rounded-[var(--radius-full)] text-xs font-medium',
        bgClass,
        colorClass,
      )}
    >
      <HardDrive className="h-3 w-3" />
      <span className="truncate max-w-[120px]">
        {gpu?.name || 'No GPU'}
      </span>
      {vramTotal > 0 && (
        <span className="opacity-75">
          {vramUsed.toFixed(1)}/{vramTotal.toFixed(0)}G
        </span>
      )}
    </div>
  )
}
