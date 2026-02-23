import Slider from '../ui/Slider'
import Select from '../ui/Select'
import Tooltip from '../ui/Tooltip'
import { useGenerationStore } from '../../stores/useGenerationStore'
import {
  VALID_KEYSCALES,
  VALID_TIME_SIGNATURES,
  VALID_LANGUAGES,
} from '../../lib/constants'
import { formatDuration } from '../../lib/utils'
import { Info } from 'lucide-react'

export default function MusicMetadata() {
  const form = useGenerationStore((s) => s.form)
  const updateForm = useGenerationStore((s) => s.updateForm)

  const keyOptions = [
    { value: '', label: 'Auto' },
    ...VALID_KEYSCALES.map((k) => ({ value: k, label: k })),
  ]

  const timeSignatureOptions = [
    { value: '', label: 'Auto' },
    ...VALID_TIME_SIGNATURES.map((ts) => ({
      value: ts.value,
      label: ts.label,
    })),
  ]

  const languageOptions = VALID_LANGUAGES.map((lang) => ({
    value: lang.code,
    label: lang.name,
  }))

  // Duration display: -1 means auto
  const durationValue = form.duration === -1 ? -1 : form.duration

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium text-[var(--text-secondary)]">
        Music Metadata
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BPM */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Tooltip content="Leave at 0 for auto-detect based on your description">
              <button
                type="button"
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>
          <Slider
            label="BPM"
            min={0}
            max={300}
            step={1}
            value={[form.bpm ?? 0]}
            onValueChange={([v]) =>
              updateForm({ bpm: v === 0 ? null : v })
            }
            formatValue={(v) => (v === 0 ? 'Auto' : String(v))}
          />
        </div>

        {/* Key */}
        <Select
          label="Key"
          options={keyOptions}
          value={form.keyscale}
          onValueChange={(v) => updateForm({ keyscale: v })}
          placeholder="Auto"
        />

        {/* Time Signature */}
        <Select
          label="Time Signature"
          options={timeSignatureOptions}
          value={form.timesignature}
          onValueChange={(v) => updateForm({ timesignature: v })}
          placeholder="Auto"
        />

        {/* Language */}
        <Select
          label="Language"
          options={languageOptions}
          value={form.vocal_language}
          onValueChange={(v) => updateForm({ vocal_language: v })}
          placeholder="Select language..."
        />

        {/* Duration */}
        <div className="md:col-span-2">
          <Slider
            label="Duration"
            min={-1}
            max={600}
            step={5}
            value={[durationValue]}
            onValueChange={([v]) => updateForm({ duration: v })}
            formatValue={(v) => (v === -1 ? 'Auto' : formatDuration(v))}
          />
        </div>
      </div>
    </div>
  )
}
