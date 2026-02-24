import { useState } from 'react'
import { Music, Settings, AlertCircle, FileJson, Download, RotateCcw, Infinity, RotateCw, Square } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { useGenerationStore } from '../../stores/useGenerationStore'
import ModelSelector from './ModelSelector'
import AdapterSelector from './AdapterSelector'
import TaskTypeSelector from './TaskTypeSelector'
import PromptEditor from './PromptEditor'
import MusicMetadata from './MusicMetadata'
import DiffusionSettings from './DiffusionSettings'
import LMSettings from './LMSettings'
import BatchSettings from './BatchSettings'
import GenerateButton from './GenerateButton'
import GenerationResults from './GenerationResults'
import ImportPresetModal from './ImportPresetModal'
import ExportPresetModal from './ExportPresetModal'
import PresetSelector from './PresetSelector'
import Tooltip from '../ui/Tooltip'

function AutoGenControls() {
  const autoGen = useGenerationStore((s) => s.autoGen)
  const autoGenMaxRuns = useGenerationStore((s) => s.autoGenMaxRuns)
  const autoGenRunCount = useGenerationStore((s) => s.autoGenRunCount)
  const setAutoGen = useGenerationStore((s) => s.setAutoGen)
  const setAutoGenMaxRuns = useGenerationStore((s) => s.setAutoGenMaxRuns)
  const resetAutoGenCount = useGenerationStore((s) => s.resetAutoGenCount)

  return (
    <div
      className={clsx(
        'flex flex-col gap-3 p-4 rounded-xl border',
        'bg-[var(--bg-secondary)]',
        autoGen
          ? 'border-[var(--accent)]/40'
          : 'border-[var(--border)]',
      )}
    >
      {/* Toggle row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCw className={clsx('w-4 h-4', autoGen ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]')} />
          <span className="text-sm font-medium text-[var(--text-primary)]">AutoGen</span>
        </div>
        <button
          onClick={() => {
            if (!autoGen) resetAutoGenCount()
            setAutoGen(!autoGen)
          }}
          className={clsx(
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
            autoGen ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)]',
          )}
        >
          <span
            className={clsx(
              'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
              autoGen ? 'translate-x-[18px]' : 'translate-x-[3px]',
            )}
          />
        </button>
      </div>

      {/* Controls (visible when on) */}
      {autoGen && (
        <div className="flex items-center gap-3">
          {/* Max runs input */}
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs text-[var(--text-muted)] whitespace-nowrap">Max runs</label>
            <input
              type="number"
              min={0}
              value={autoGenMaxRuns}
              onChange={(e) => setAutoGenMaxRuns(Math.max(0, Number(e.target.value) || 0))}
              className={clsx(
                'h-7 w-16 px-2 text-xs rounded-md text-center',
                'bg-[var(--bg-elevated)] text-[var(--text-primary)]',
                'border border-[var(--border)] focus:outline-none focus:border-[var(--accent)]',
              )}
            />
            {autoGenMaxRuns === 0 && (
              <Infinity className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            )}
          </div>

          {/* Run counter */}
          <span className="text-xs tabular-nums text-[var(--accent)] font-medium whitespace-nowrap">
            Run {autoGenRunCount}{autoGenMaxRuns > 0 ? ` / ${autoGenMaxRuns}` : ' / ∞'}
          </span>

          {/* Stop button */}
          <button
            onClick={() => setAutoGen(false)}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
              'bg-[var(--error-muted)] text-[var(--error)]',
              'hover:bg-[var(--error)]/20 transition-colors',
            )}
          >
            <Square className="w-3 h-3" fill="currentColor" />
            Stop
          </button>
        </div>
      )}
    </div>
  )
}

export default function GeneratePage() {
  const modelStatus = useSettingsStore((s) => s.modelStatus)
  const isInitialized = modelStatus?.initialized ?? false
  const resetForm = useGenerationStore((s) => s.resetForm)
  const navigate = useNavigate()

  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--accent-muted)]">
            <Music className="w-5 h-5 text-[var(--accent-hover)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Generate Music
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Create original music with ACE-Step
            </p>
          </div>
        </div>

        {/* Preset toolbar — only when model is ready */}
        {isInitialized && (
          <div className="flex items-center gap-1.5">
            <PresetSelector />
            <Tooltip content="Import JSON preset">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
              >
                <FileJson className="w-3.5 h-3.5" />
                Import
              </button>
            </Tooltip>
            <Tooltip content="Export current settings as JSON">
              <button
                onClick={() => setShowExport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </Tooltip>
            <Tooltip content="Reset form to defaults">
              <button
                onClick={resetForm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Setup required overlay */}
      {!isInitialized && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 rounded-[var(--radius-lg)] border border-[var(--warning)]/20 bg-[var(--warning-muted)]">
          <AlertCircle className="w-10 h-10 text-[var(--warning)]" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            No Model Loaded
          </h2>
          <p className="text-sm text-[var(--text-secondary)] text-center max-w-md">
            Before generating music, you need to configure your checkpoint directory
            and load a model. Head to Settings to get started.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius)] bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Settings className="w-4 h-4" />
            Go to Settings
          </button>
        </div>
      )}

      {/* Two-column layout — only shown when model is loaded */}
      {isInitialized && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column: Form (60%) */}
          <div className="flex flex-col gap-5 lg:w-[60%] min-w-0">
            {/* Model & Adapter quick selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-1">
                  Model
                </span>
                <ModelSelector />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-1">
                  LoRA / LoKr Adapter
                </span>
                <AdapterSelector />
              </div>
            </div>

            <TaskTypeSelector />
            <PromptEditor />
            <MusicMetadata />
            <DiffusionSettings />
            <LMSettings />
            <BatchSettings />
          </div>

          {/* Right column: Generate + AutoGen + Results (40%) */}
          <div className="flex flex-col gap-5 lg:w-[40%] min-w-0">
            <GenerateButton />
            <AutoGenControls />
            <GenerationResults />
          </div>
        </div>
      )}

      {/* Modals */}
      <ImportPresetModal open={showImport} onClose={() => setShowImport(false)} />
      <ExportPresetModal open={showExport} onClose={() => setShowExport(false)} />
    </div>
  )
}
