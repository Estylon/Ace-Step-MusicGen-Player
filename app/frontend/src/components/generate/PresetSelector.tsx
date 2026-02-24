import { useState, useEffect, useRef } from 'react'
import { BookmarkPlus, ChevronDown, Trash2, Save, FolderOpen } from 'lucide-react'
import clsx from 'clsx'
import { usePresetStore } from '../../stores/usePresetStore'
import { useGenerationStore } from '../../stores/useGenerationStore'
import { exportPreset } from '../../lib/presetIO'

export default function PresetSelector() {
  const presets = usePresetStore((s) => s.presets)
  const fetchPresets = usePresetStore((s) => s.fetchPresets)
  const createPreset = usePresetStore((s) => s.createPreset)
  const updatePreset = usePresetStore((s) => s.updatePreset)
  const deletePreset = usePresetStore((s) => s.deletePreset)

  const form = useGenerationStore((s) => s.form)
  const importPreset = useGenerationStore((s) => s.importPreset)

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch presets on mount
  useEffect(() => {
    fetchPresets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSaving(false)
        setConfirmDelete(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLoad = (paramsJson: string) => {
    try {
      const parsed = JSON.parse(paramsJson)
      importPreset(parsed)
    } catch {
      console.error('Failed to parse preset params')
    }
    setOpen(false)
  }

  const handleSave = async () => {
    if (!saveName.trim()) return
    try {
      const paramsJson = exportPreset(form, { indent: 0 })
      await createPreset(saveName.trim(), paramsJson)
      setSaveName('')
      setSaving(false)
    } catch (err) {
      console.error('Failed to save preset:', err)
    }
  }

  const handleOverwrite = async (id: string) => {
    try {
      const paramsJson = exportPreset(form, { indent: 0 })
      await updatePreset(id, undefined, paramsJson)
    } catch (err) {
      console.error('Failed to update preset:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
      return
    }
    try {
      await deletePreset(id)
      setConfirmDelete(null)
    } catch (err) {
      console.error('Failed to delete preset:', err)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => {
          setOpen(!open)
          setSaving(false)
          setConfirmDelete(null)
        }}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium',
          'text-[var(--text-secondary)] bg-[var(--bg-secondary)]',
          'border border-[var(--border)]',
          'hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
          'transition-colors',
          open && 'border-[var(--accent)] text-[var(--accent)]',
        )}
      >
        <FolderOpen className="w-3.5 h-3.5" />
        Presets
        <ChevronDown className={clsx('w-3 h-3 transition-transform', open && 'rotate-180')} />
        {presets.length > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[var(--accent-muted)] text-[var(--accent)]">
            {presets.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={clsx(
            'absolute top-full left-0 mt-1.5 z-50 min-w-[280px] max-w-[360px]',
            'rounded-[var(--radius-lg)] border border-[var(--border)]',
            'bg-[var(--bg-primary)] shadow-lg',
            'overflow-hidden',
          )}
        >
          {/* Save new preset section */}
          <div className="p-2.5 border-b border-[var(--border)]">
            {saving ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave()
                    if (e.key === 'Escape') setSaving(false)
                  }}
                  placeholder="Preset name..."
                  autoFocus
                  className={clsx(
                    'flex-1 h-7 px-2 text-xs rounded-[var(--radius)]',
                    'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
                    'border border-[var(--border)]',
                    'placeholder:text-[var(--text-muted)]',
                    'focus:outline-none focus:border-[var(--accent)]',
                  )}
                />
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim()}
                  className={clsx(
                    'flex items-center gap-1 px-2 py-1 rounded-[var(--radius)] text-xs font-medium',
                    'bg-[var(--accent)] text-white',
                    'hover:bg-[var(--accent-hover)]',
                    'disabled:opacity-40 disabled:pointer-events-none',
                    'transition-colors',
                  )}
                >
                  <Save className="w-3 h-3" />
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSaving(true)}
                className={clsx(
                  'flex items-center gap-2 w-full px-2 py-1.5 rounded-[var(--radius)] text-xs font-medium',
                  'text-[var(--accent)]',
                  'hover:bg-[var(--accent-muted)]',
                  'transition-colors',
                )}
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                Save current settings as preset
              </button>
            )}
          </div>

          {/* Preset list */}
          <div className="max-h-[300px] overflow-y-auto">
            {presets.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-[var(--text-muted)]">
                No saved presets yet
              </div>
            ) : (
              presets.map((preset) => (
                <div
                  key={preset.id}
                  className={clsx(
                    'flex items-center gap-2 px-2.5 py-2 group',
                    'hover:bg-[var(--bg-hover)]',
                    'transition-colors',
                  )}
                >
                  {/* Load button (the preset name) */}
                  <button
                    onClick={() => handleLoad(preset.params_json)}
                    className="flex-1 text-left text-xs font-medium text-[var(--text-primary)] truncate hover:text-[var(--accent)] transition-colors"
                    title={`Load "${preset.name}"`}
                  >
                    {preset.name}
                  </button>

                  {/* Overwrite (save current to this slot) */}
                  <button
                    onClick={() => handleOverwrite(preset.id)}
                    className={clsx(
                      'p-1 rounded text-[var(--text-muted)]',
                      'opacity-0 group-hover:opacity-100',
                      'hover:text-[var(--accent)] hover:bg-[var(--accent-muted)]',
                      'transition-all',
                    )}
                    title="Overwrite with current settings"
                  >
                    <Save className="w-3 h-3" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(preset.id)}
                    className={clsx(
                      'p-1 rounded',
                      'transition-all',
                      confirmDelete === preset.id
                        ? 'opacity-100 text-[var(--error)] bg-[var(--error-muted)]'
                        : 'opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error-muted)]',
                    )}
                    title={confirmDelete === preset.id ? 'Click again to confirm' : 'Delete preset'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
