import { NavLink } from 'react-router-dom'
import { Music, Scissors, Library, Settings, Cpu, Zap, HardDrive, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import Badge from '../ui/Badge'
import { useSettingsStore } from '../../stores/useSettingsStore'

const navItems = [
  { to: '/generate', label: 'Generate', icon: Music },
  { to: '/stems', label: 'Stems', icon: Scissors },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export default function Sidebar() {
  const modelStatus = useSettingsStore((s) => s.modelStatus)
  const adapterList = useSettingsStore((s) => s.adapterList)

  const isInitialized = modelStatus?.initialized ?? false
  const gpu = modelStatus?.gpu
  const model = modelStatus?.current_model
  const lm = modelStatus?.lm
  const adapter = adapterList?.current

  const vramFree = gpu?.vram_free_gb ?? 0
  const vramTotal = gpu?.vram_total_gb ?? 0
  const vramUsed = vramTotal > 0 ? vramTotal - vramFree : 0
  const vramPercent = vramTotal > 0 ? (vramUsed / vramTotal) * 100 : 0
  const vramFreePercent = vramTotal > 0 ? (vramFree / vramTotal) * 100 : 100

  const gpuTier: 'success' | 'warning' | 'error' =
    vramFreePercent > 50 ? 'success' : vramFreePercent > 25 ? 'warning' : 'error'

  return (
    <aside
      className="flex flex-col h-full border-r border-[var(--border)] bg-[var(--bg-secondary)]"
      style={{ width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)' }}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-2 px-4 h-14 shrink-0">
        <div className="w-7 h-7 rounded-[var(--radius)] bg-gradient-accent flex items-center justify-center">
          <Music className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
          ACE-Step Player
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 px-2 mt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-[var(--radius)] text-sm',
                'transition-colors duration-[var(--transition)]',
                isActive
                  ? 'bg-[var(--accent-muted)] text-[var(--text-primary)] border-l-2 border-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Separator */}
      <div className="mx-4 my-3 h-px bg-[var(--border)]" />

      {/* Setup required banner */}
      {!isInitialized && (
        <div className="mx-3 mb-3 flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] bg-[var(--warning-muted)] border border-[var(--warning)]/20">
          <AlertCircle className="h-3.5 w-3.5 text-[var(--warning)] shrink-0" />
          <span className="text-xs text-[var(--warning)]">
            No model loaded
          </span>
        </div>
      )}

      {/* Model Status */}
      <div className="px-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Model
          </span>
          <div className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
            <span className="text-sm text-[var(--text-primary)] truncate">
              {model?.name || 'Not loaded'}
            </span>
          </div>
          {model?.type && (
            <Badge variant="accent" className="self-start mt-0.5">
              {model.type}
            </Badge>
          )}
        </div>

        {/* Adapter */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Adapter
          </span>
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
            <span className="text-sm text-[var(--text-secondary)] truncate">
              {adapter?.loaded ? adapter.name : 'None'}
            </span>
          </div>
          {adapter?.loaded && adapter.scale != null && (
            <span className="text-xs text-[var(--text-muted)]">
              Scale: {adapter.scale}
            </span>
          )}
        </div>
      </div>

      {/* Separator */}
      <div className="mx-4 my-3 h-px bg-[var(--border)]" />

      {/* GPU Status */}
      <div className="px-4 flex flex-col gap-3 mb-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
            GPU
          </span>
          <div className="flex items-center gap-2">
            <HardDrive className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
            <span className="text-sm text-[var(--text-primary)] truncate">
              {gpu?.name || 'Unknown'}
            </span>
          </div>
          {/* VRAM bar */}
          {vramTotal > 0 && (
            <div className="flex flex-col gap-1">
              <div className="w-full h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${vramPercent}%`,
                    backgroundColor:
                      gpuTier === 'success'
                        ? 'var(--success)'
                        : gpuTier === 'warning'
                          ? 'var(--warning)'
                          : 'var(--error)',
                  }}
                />
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {vramUsed.toFixed(1)} / {vramTotal.toFixed(1)} GB
              </span>
            </div>
          )}
          {vramTotal > 0 && (
            <Badge variant={gpuTier} className="self-start">
              {gpuTier === 'success' ? 'Healthy' : gpuTier === 'warning' ? 'Moderate' : 'Low VRAM'}
            </Badge>
          )}
        </div>

        {/* LM Status */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
            LM Status
          </span>
          <span className="text-sm text-[var(--text-secondary)] truncate">
            {lm?.loaded ? lm.model : 'Not loaded'}
          </span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />
    </aside>
  )
}
