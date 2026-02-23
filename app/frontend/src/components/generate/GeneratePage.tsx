import { Music, Settings, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSettingsStore } from '../../stores/useSettingsStore'
import TaskTypeSelector from './TaskTypeSelector'
import PromptEditor from './PromptEditor'
import MusicMetadata from './MusicMetadata'
import DiffusionSettings from './DiffusionSettings'
import LMSettings from './LMSettings'
import BatchSettings from './BatchSettings'
import GenerateButton from './GenerateButton'
import GenerationResults from './GenerationResults'

export default function GeneratePage() {
  const modelStatus = useSettingsStore((s) => s.modelStatus)
  const adapterList = useSettingsStore((s) => s.adapterList)
  const adapterLoaded = adapterList?.current?.loaded ?? false
  const isInitialized = modelStatus?.initialized ?? false
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
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
            <TaskTypeSelector />
            <PromptEditor />
            <MusicMetadata />
            <DiffusionSettings />
            <LMSettings />
            <BatchSettings />

            {adapterLoaded && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] bg-[var(--accent-muted)] border border-[var(--accent)] border-opacity-30">
                <span className="text-xs text-[var(--accent-hover)]">
                  LoRA adapter active: {adapterList?.current?.name}
                </span>
              </div>
            )}
          </div>

          {/* Right column: Generate + Results (40%) */}
          <div className="flex flex-col gap-5 lg:w-[40%] min-w-0">
            <GenerateButton />
            <GenerationResults />
          </div>
        </div>
      )}
    </div>
  )
}
