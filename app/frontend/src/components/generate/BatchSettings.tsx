import Select from '../ui/Select'
import Badge from '../ui/Badge'
import { useGenerationStore } from '../../stores/useGenerationStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { AUDIO_FORMATS } from '../../lib/constants'

const BATCH_SIZES = [1, 2, 3, 4, 5, 6, 7, 8]

export default function BatchSettings() {
  const form = useGenerationStore((s) => s.form)
  const updateForm = useGenerationStore((s) => s.updateForm)
  const modelStatus = useSettingsStore((s) => s.modelStatus)

  const gpu = modelStatus?.gpu
  const vramTotal = gpu?.vram_total_gb ?? 0

  // Rough heuristic: warn if batch size might exceed VRAM
  // ~4GB per batch item for a typical generation
  const estimatedVram = form.batch_size * 4
  const showWarning = vramTotal > 0 && estimatedVram > vramTotal * 0.85

  const batchOptions = BATCH_SIZES.map((n) => ({
    value: String(n),
    label: String(n),
  }))

  const formatOptions = AUDIO_FORMATS.map((fmt) => ({
    value: fmt,
    label: fmt.toUpperCase(),
  }))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center flex-wrap gap-4">
        <div className="w-28">
          <Select
            label="Batch Size"
            options={batchOptions}
            value={String(form.batch_size)}
            onValueChange={(v) =>
              updateForm({ batch_size: parseInt(v, 10) || 1 })
            }
          />
        </div>
        <div className="w-32">
          <Select
            label="Audio Format"
            options={formatOptions}
            value={form.audio_format}
            onValueChange={(v) => updateForm({ audio_format: v })}
          />
        </div>
        {showWarning && (
          <Badge variant="warning" className="self-end mb-1">
            May exceed GPU VRAM ({vramTotal.toFixed(0)} GB)
          </Badge>
        )}
      </div>
    </div>
  )
}
