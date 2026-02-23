import Select from '../ui/Select'
import { useGenerationStore } from '../../stores/useGenerationStore'
import { TRACK_NAMES } from '../../lib/constants'

export default function TrackSelector() {
  const trackName = useGenerationStore((s) => s.form.track_name)
  const updateForm = useGenerationStore((s) => s.updateForm)

  const options = TRACK_NAMES.map((name) => ({
    value: name,
    label: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
  }))

  return (
    <Select
      label="Track / Instrument"
      options={options}
      value={trackName ?? ''}
      onValueChange={(v) => updateForm({ track_name: v || null })}
      placeholder="Select a track..."
    />
  )
}
