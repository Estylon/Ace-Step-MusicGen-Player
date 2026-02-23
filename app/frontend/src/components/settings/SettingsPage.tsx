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
  Play,
  Cpu,
} from 'lucide-react'
import clsx from 'clsx'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Header from '../layout/Header'
import {
  getSettings,
  updateSettings,
  validatePath,
  browseFolder,
  type UserSettings,
} from '../../api/settings'
import { getModelStatus, loadModel } from '../../api/models'
import { useSettingsStore } from '../../stores/useSettingsStore'
import type { ModelStatusResponse } from '../../types/api'

// ── Path input with validation + native folder picker ───────────────────────

interface PathInputProps {
  label: string
  description: string
  value: string
  onChange: (value: string) => void
  onValidate?: (value: string) => void
  valid?: boolean | null
  validating?: boolean
  browseTitle?: string
}

function PathInput({
  label,
  description,
  value,
  onChange,
  onValidate,
  valid,
  validating,
  browseTitle,
}: PathInputProps) {
  const [browsing, setBrowsing] = useState(false)

  const handleBrowse = async () => {
    setBrowsing(true)
    try {
      const result = await browseFolder(browseTitle ?? `Select ${label}`, value)
      if (result.selected && result.path) {
        onChange(result.path)
        onValidate?.(result.path)
      }
    } catch (err) {
      console.error('Browse folder failed:', err)
    } finally {
      setBrowsing(false)
    }
  }

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
            placeholder="Enter path or click Browse..."
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
          onClick={handleBrowse}
          disabled={browsing}
          title="Browse folder"
          className={clsx(
            'flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius)]',
            'text-sm font-medium transition-colors',
            'border border-[var(--border)]',
            browsing
              ? 'text-[var(--text-muted)] bg-[var(--bg-tertiary)] cursor-wait'
              : 'text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
          )}
        >
          {browsing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FolderOpen className="h-4 w-4" />
          )}
          Browse
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

// ── LoRA path row with browse + validation + remove ─────────────────────────

interface LoraPathRowProps {
  value: string
  onChange: (value: string) => void
  onValidate: (value: string) => void
  onRemove: () => void
  valid?: boolean | null
  validating?: boolean
}

function LoraPathRow({
  value,
  onChange,
  onValidate,
  onRemove,
  valid,
  validating: isValidating,
}: LoraPathRowProps) {
  const [browsing, setBrowsing] = useState(false)

  const handleBrowse = async () => {
    setBrowsing(true)
    try {
      const result = await browseFolder('Select LoRA / LoKr Folder', value)
      if (result.selected && result.path) {
        onChange(result.path)
        onValidate(result.path)
      }
    } catch (err) {
      console.error('Browse folder failed:', err)
    } finally {
      setBrowsing(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onValidate(value)}
          placeholder="Enter path or click Browse..."
          className="font-mono text-sm pr-8"
        />
        {isValidating && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] animate-spin" />
        )}
        {!isValidating && valid === true && (
          <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--success)]" />
        )}
        {!isValidating && valid === false && (
          <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--error)]" />
        )}
      </div>
      <button
        onClick={handleBrowse}
        disabled={browsing}
        title="Browse folder"
        className={clsx(
          'flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius)]',
          'text-sm font-medium transition-colors',
          'border border-[var(--border)]',
          browsing
            ? 'text-[var(--text-muted)] bg-[var(--bg-tertiary)] cursor-wait'
            : 'text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
        )}
      >
        {browsing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FolderOpen className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={onRemove}
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
  )
}

// ── Main Settings Page ──────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Model loading state
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null)
  const [modelLoading, setModelLoading] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const refreshGlobalStatus = useSettingsStore((s) => s.fetchModelStatus)

  // Form state
  const [trainerPath, setTrainerPath] = useState('')
  const [checkpointDir, setCheckpointDir] = useState('')
  const [loraPaths, setLoraPaths] = useState<string[]>([])
  const [outputDir, setOutputDir] = useState('')
  const [stemsDir, setStemsDir] = useState('')

  // Validation state
  const [validation, setValidation] = useState<Record<string, boolean | null>>({})
  const [validating, setValidating] = useState<Record<string, boolean>>({})

  // Load settings + model status
  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const [s, ms] = await Promise.all([getSettings(), getModelStatus()])
      setSettings(s)
      setModelStatus(ms)
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
      // Refresh model status (available models may have changed)
      try {
        const ms = await getModelStatus()
        setModelStatus(ms)
      } catch { /* ignore */ }
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }, [trainerPath, checkpointDir, loraPaths, outputDir, stemsDir])

  // Load a model
  const handleLoadModel = useCallback(async (modelName: string) => {
    setModelLoading(true)
    setModelError(null)
    try {
      await loadModel(modelName)
      // Refresh status
      const ms = await getModelStatus()
      setModelStatus(ms)
      // Update global store so sidebar updates
      refreshGlobalStatus()
    } catch (err) {
      setModelError(err instanceof Error ? err.message : 'Failed to load model')
    } finally {
      setModelLoading(false)
    }
  }, [refreshGlobalStatus])

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

  const isInitialized = modelStatus?.initialized ?? false
  const availableModels = modelStatus?.available_models ?? []
  const currentModel = modelStatus?.current_model

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

      {/* Setup required banner */}
      {!isInitialized && (
        <div className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] bg-[var(--accent-muted)] border border-[var(--accent)]/30">
          <AlertCircle className="h-5 w-5 text-[var(--accent-hover)] shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Setup Required
            </span>
            <span className="text-sm text-[var(--text-secondary)]">
              Configure the paths below, save, then load a model to start generating music.
            </span>
          </div>
        </div>
      )}

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
            description="Parent directory containing model folders (e.g. acestep-v15-turbo, acestep-v15-base). Can also point to a single model folder."
            value={checkpointDir}
            onChange={setCheckpointDir}
            onValidate={(v) => handleValidate('checkpoint', v)}
            valid={validation.checkpoint}
            validating={validating.checkpoint}
          />
        </div>
      </Card>

      {/* Load Model */}
      <Card>
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Load Model
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {isInitialized
                  ? 'Switch between available models. Save settings first if you changed the checkpoint directory.'
                  : 'Save your paths above first, then select a model to load.'}
              </p>
            </div>
            {currentModel && (
              <Badge variant="success">
                <Cpu className="h-3 w-3 mr-1" />
                {currentModel.name}
              </Badge>
            )}
          </div>

          {/* Model error */}
          {modelError && (
            <div className="flex items-center gap-2 p-2 rounded-[var(--radius)] bg-[var(--error)]/10">
              <AlertCircle className="h-4 w-4 text-[var(--error)] shrink-0" />
              <span className="text-xs text-[var(--error)]">{modelError}</span>
            </div>
          )}

          {/* Available models list */}
          {availableModels.length > 0 ? (
            <div className="flex flex-col gap-2">
              {availableModels.map((m) => (
                <div
                  key={m.name}
                  className={clsx(
                    'flex items-center justify-between p-3 rounded-[var(--radius)]',
                    'border transition-colors',
                    m.loaded
                      ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                      : 'border-[var(--border)] bg-[var(--bg-tertiary)] hover:border-[var(--border-hover)]',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Cpu className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {m.name}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {m.type} &middot; {m.capabilities.max_steps} steps max
                        {m.capabilities.cfg_support ? ' &middot; CFG' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={m.type === 'turbo' ? 'accent' : m.type === 'base' ? 'default' : 'warning'}>
                      {m.type}
                    </Badge>
                    {m.loaded ? (
                      <Badge variant="success">Loaded</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleLoadModel(m.name)}
                        loading={modelLoading}
                        disabled={isDirty}
                      >
                        <Play className="h-3 w-3" />
                        Load
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Cpu className="h-8 w-8 text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">
                No models found in the checkpoint directory.
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Make sure the checkpoint directory path is correct and contains model folders with config.json files.
              </p>
            </div>
          )}

          {isDirty && availableModels.length > 0 && (
            <p className="text-xs text-[var(--warning)]">
              Save your settings first before loading a model.
            </p>
          )}
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
            <LoraPathRow
              key={index}
              value={path}
              onChange={(v) => updateLoraPath(index, v)}
              onValidate={(v) => handleValidate(`lora_${index}`, v)}
              onRemove={() => removeLoraPath(index)}
              valid={validation[`lora_${index}`]}
              validating={validating[`lora_${index}`]}
            />
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
