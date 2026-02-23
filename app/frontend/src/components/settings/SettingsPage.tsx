import { useState, useEffect, useCallback } from 'react'
import {
  FolderOpen,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import clsx from 'clsx'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Card from '../ui/Card'
import Header from '../layout/Header'
import {
  getSettings,
  updateSettings,
  validatePath,
  type UserSettings,
} from '../../api/settings'

// ── Path input with validation ──────────────────────────────────────────────

interface PathInputProps {
  label: string
  description: string
  value: string
  onChange: (value: string) => void
  onValidate?: (value: string) => void
  valid?: boolean | null
  validating?: boolean
}

function PathInput({
  label,
  description,
  value,
  onChange,
  onValidate,
  valid,
  validating,
}: PathInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[var(--text-primary)]">
        {label}
      </label>
      <p className="text-xs text-[var(--text-muted)]">{description}</p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => onValidate?.(value)}
            placeholder="Enter path..."
            className="font-mono text-sm pr-8"
          />
          {validating && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] animate-spin" />
          )}
          {!validating && valid === true && (
            <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--success)]" />
          )}
          {!validating && valid === false && (
            <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--error)]" />
          )}
        </div>
        <button
          onClick={() => onValidate?.(value)}
          title="Validate path"
          className={clsx(
            'p-2 rounded-[var(--radius)]',
            'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            'hover:bg-[var(--bg-hover)] transition-colors',
          )}
        >
          <FolderOpen className="h-4 w-4" />
        </button>
      </div>
      {!validating && valid === false && (
        <span className="text-xs text-[var(--error)]">
          Path does not exist or is not accessible
        </span>
      )}
    </div>
  )
}

// ── Main Settings Page ──────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [trainerPath, setTrainerPath] = useState('')
  const [checkpointDir, setCheckpointDir] = useState('')
  const [loraPaths, setLoraPaths] = useState<string[]>([])
  const [outputDir, setOutputDir] = useState('')
  const [stemsDir, setStemsDir] = useState('')

  // Validation state
  const [validation, setValidation] = useState<Record<string, boolean | null>>({})
  const [validating, setValidating] = useState<Record<string, boolean>>({})

  // Load settings
  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const s = await getSettings()
      setSettings(s)
      setTrainerPath(s.trainer_path)
      setCheckpointDir(s.checkpoint_dir)
      setLoraPaths(s.lora_search_paths)
      setOutputDir(s.output_dir)
      setStemsDir(s.stems_output_dir)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Validate a single path
  const handleValidate = useCallback(async (key: string, path: string) => {
    if (!path.trim()) {
      setValidation((prev) => ({ ...prev, [key]: null }))
      return
    }
    setValidating((prev) => ({ ...prev, [key]: true }))
    try {
      const result = await validatePath(path)
      setValidation((prev) => ({ ...prev, [key]: result.valid && result.is_dir }))
    } catch {
      setValidation((prev) => ({ ...prev, [key]: false }))
    } finally {
      setValidating((prev) => ({ ...prev, [key]: false }))
    }
  }, [])

  // Save settings
  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const updated = await updateSettings({
        trainer_path: trainerPath,
        checkpoint_dir: checkpointDir,
        lora_search_paths: loraPaths.filter((p) => p.trim()),
        output_dir: outputDir,
        stems_output_dir: stemsDir,
      })
      setSettings(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }, [trainerPath, checkpointDir, loraPaths, outputDir, stemsDir])

  // LoRA path helpers
  const addLoraPath = useCallback(() => {
    setLoraPaths((prev) => [...prev, ''])
  }, [])

  const removeLoraPath = useCallback((index: number) => {
    setLoraPaths((prev) => prev.filter((_, i) => i !== index))
    setValidation((prev) => {
      const next = { ...prev }
      delete next[`lora_${index}`]
      return next
    })
  }, [])

  const updateLoraPath = useCallback((index: number, value: string) => {
    setLoraPaths((prev) => prev.map((p, i) => (i === index ? value : p)))
  }, [])

  // Check if form is dirty
  const isDirty =
    settings !== null &&
    (trainerPath !== settings.trainer_path ||
      checkpointDir !== settings.checkpoint_dir ||
      outputDir !== settings.output_dir ||
      stemsDir !== settings.stems_output_dir ||
      JSON.stringify(loraPaths.filter((p) => p.trim())) !==
        JSON.stringify(settings.lora_search_paths))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 text-[var(--accent)] animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      <Header
        title="Settings"
        subtitle="Configure model paths, LoRA directories, and output locations"
      />

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius)] bg-[var(--error)]/10 border border-[var(--error)]/30">
          <AlertCircle className="h-4 w-4 text-[var(--error)] shrink-0" />
          <span className="text-sm text-[var(--error)]">{error}</span>
        </div>
      )}

      {/* Model Paths */}
      <Card>
        <div className="flex flex-col gap-5 p-5">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Model Paths
          </h3>

          <PathInput
            label="ACE-Step Trainer Path"
            description="Root directory of your ACE-Step trainer installation (contains the 'acestep' module)"
            value={trainerPath}
            onChange={setTrainerPath}
            onValidate={(v) => handleValidate('trainer', v)}
            valid={validation.trainer}
            validating={validating.trainer}
          />

          <PathInput
            label="Checkpoint Directory"
            description="Directory containing model checkpoints (turbo, base, SFT, custom). Usually {trainer}/checkpoints"
            value={checkpointDir}
            onChange={setCheckpointDir}
            onValidate={(v) => handleValidate('checkpoint', v)}
            valid={validation.checkpoint}
            validating={validating.checkpoint}
          />
        </div>
      </Card>

      {/* LoRA / LoKr Search Paths */}
      <Card>
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                LoRA / LoKr Search Paths
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Directories to scan for adapter weights. Each subfolder will be checked for LoRA or LoKr files.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={addLoraPath}>
              <Plus className="h-3.5 w-3.5" />
              Add Path
            </Button>
          </div>

          {loraPaths.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <FolderOpen className="h-8 w-8 text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">
                No search paths configured. Add a directory to scan for adapters.
              </p>
            </div>
          )}

          {loraPaths.map((path, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  value={path}
                  onChange={(e) => updateLoraPath(index, e.target.value)}
                  onBlur={() => handleValidate(`lora_${index}`, path)}
                  placeholder="Enter LoRA/LoKr folder path..."
                  className="font-mono text-sm pr-8"
                />
                {validating[`lora_${index}`] && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] animate-spin" />
                )}
                {!validating[`lora_${index}`] && validation[`lora_${index}`] === true && (
                  <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--success)]" />
                )}
                {!validating[`lora_${index}`] && validation[`lora_${index}`] === false && (
                  <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--error)]" />
                )}
              </div>
              <button
                onClick={() => removeLoraPath(index)}
                title="Remove path"
                className={clsx(
                  'p-2 rounded-[var(--radius)]',
                  'text-[var(--text-muted)] hover:text-[var(--error)]',
                  'hover:bg-[var(--error)]/10 transition-colors',
                )}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Output Directories */}
      <Card>
        <div className="flex flex-col gap-5 p-5">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Output Directories
          </h3>

          <PathInput
            label="Audio Output Directory"
            description="Where generated audio files are saved"
            value={outputDir}
            onChange={setOutputDir}
            onValidate={(v) => handleValidate('output', v)}
            valid={validation.output}
            validating={validating.output}
          />

          <PathInput
            label="Stems Output Directory"
            description="Where separated stem audio files are saved"
            value={stemsDir}
            onChange={setStemsDir}
            onValidate={(v) => handleValidate('stems', v)}
            valid={validation.stems}
            validating={validating.stems}
          />
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} loading={saving} disabled={!isDirty}>
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
        <Button variant="secondary" onClick={fetchSettings}>
          <RefreshCw className="h-4 w-4" />
          Reset
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-[var(--success)]">
            <CheckCircle2 className="h-4 w-4" />
            Settings saved successfully
          </span>
        )}
      </div>
    </div>
  )
}
