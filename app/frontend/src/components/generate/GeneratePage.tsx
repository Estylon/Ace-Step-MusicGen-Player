import { useState } from 'react'
import { Music, Settings, AlertCircle, FileJson, Download, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
import Tooltip from '../ui/Tooltip'

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

          {/* Right column: Generate + Results (40%) */}
          <div className="flex flex-col gap-5 lg:w-[40%] min-w-0">
            <GenerateButton />
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
