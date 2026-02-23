import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import ProgressRing from '../ui/ProgressRing'
import { useGenerationStore } from '../../stores/useGenerationStore'

export default function GenerateButton() {
  const form = useGenerationStore((s) => s.form)
  const activeJobs = useGenerationStore((s) => s.activeJobs)
  const generate = useGenerationStore((s) => s.generate)
  const [error, setError] = useState<string | null>(null)

  // Find the latest running or queued job
  const runningJob = Array.from(activeJobs.values()).find(
    (j) => j.status === 'running' || j.status === 'queued',
  )
  const isGenerating = !!runningJob

  // Disable when there is no caption and no lyrics for text2music
  const isText2Music = form.task_type === 'text2music'
  const hasContent = form.caption.trim().length > 0 || form.lyrics.trim().length > 0
  const isDisabled = (isText2Music && !hasContent) || isGenerating

  const handleGenerate = async () => {
    setError(null)
    try {
      await generate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={isDisabled}
        onClick={handleGenerate}
        className={`
          relative flex items-center justify-center gap-2.5
          w-full h-14 rounded-[var(--radius-lg)]
          text-base font-semibold text-white
          bg-gradient-accent
          transition-all duration-[var(--transition)]
          hover:brightness-110 hover:shadow-[var(--accent-glow)]
          active:brightness-95
          focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:hover:shadow-none
        `}
      >
        {isGenerating ? (
          <>
            <ProgressRing
              progress={runningJob?.progress ?? 0}
              size={24}
              strokeWidth={2.5}
              className="shrink-0"
            />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>Generate</span>
          </>
        )}
      </button>

      {/* Status message */}
      {runningJob && (
        <p className="text-xs text-center text-[var(--text-muted)]">
          {runningJob.message}
        </p>
      )}

      {/* Error message */}
      {error && !isGenerating && (
        <p className="text-xs text-center text-[var(--error)]">{error}</p>
      )}
    </div>
  )
}
