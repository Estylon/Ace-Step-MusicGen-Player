import Collapsible from '../ui/Collapsible'
import Slider from '../ui/Slider'
import Input from '../ui/Input'
import { useGenerationStore } from '../../stores/useGenerationStore'

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none w-fit">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`
          relative inline-flex h-5 w-9 shrink-0 items-center rounded-full
          border-2 border-transparent transition-colors duration-[var(--transition)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
          ${checked ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)]'}
        `}
      >
        <span
          className={`
            pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm
            transition-transform duration-[var(--transition)]
            ${checked ? 'translate-x-4' : 'translate-x-0.5'}
          `}
        />
      </button>
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
    </label>
  )
}

export default function LMSettings() {
  const form = useGenerationStore((s) => s.form)
  const updateForm = useGenerationStore((s) => s.updateForm)

  return (
    <Collapsible title="Language Model (Chain-of-Thought)" defaultOpen={false}>
      <div className="flex flex-col gap-4">
        {/* Enable Thinking toggle */}
        <ToggleSwitch
          checked={form.thinking}
          onChange={() => updateForm({ thinking: !form.thinking })}
          label="Enable Thinking"
        />

        {form.thinking && (
          <div className="flex flex-col gap-4 pl-2 border-l-2 border-[var(--border)]">
            {/* Temperature */}
            <Slider
              label="Temperature"
              min={0}
              max={2}
              step={0.05}
              value={[form.lm_temperature]}
              onValueChange={([v]) => updateForm({ lm_temperature: v })}
              formatValue={(v) => v.toFixed(2)}
            />

            {/* CFG Scale */}
            <Slider
              label="CFG Scale"
              min={0}
              max={10}
              step={0.1}
              value={[form.lm_cfg_scale]}
              onValueChange={([v]) => updateForm({ lm_cfg_scale: v })}
              formatValue={(v) => v.toFixed(1)}
            />

            {/* Top-K */}
            <Input
              label="Top-K"
              type="number"
              value={form.lm_top_k}
              onChange={(e) =>
                updateForm({
                  lm_top_k: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              placeholder="0 = disabled"
            />

            {/* Top-P */}
            <Slider
              label="Top-P"
              min={0}
              max={1}
              step={0.05}
              value={[form.lm_top_p]}
              onValueChange={([v]) => updateForm({ lm_top_p: v })}
              formatValue={(v) => v.toFixed(2)}
            />

            {/* CoT Toggles */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Chain-of-Thought Targets
              </span>
              <ToggleSwitch
                checked={form.use_cot_metas}
                onChange={() =>
                  updateForm({ use_cot_metas: !form.use_cot_metas })
                }
                label="Use CoT for Metadata"
              />
              <ToggleSwitch
                checked={form.use_cot_caption}
                onChange={() =>
                  updateForm({ use_cot_caption: !form.use_cot_caption })
                }
                label="Use CoT for Caption"
              />
              <ToggleSwitch
                checked={form.use_cot_language}
                onChange={() =>
                  updateForm({ use_cot_language: !form.use_cot_language })
                }
                label="Use CoT for Language"
              />
            </div>

            {/* Constrained Decoding */}
            <ToggleSwitch
              checked={form.use_constrained_decoding}
              onChange={() =>
                updateForm({
                  use_constrained_decoding: !form.use_constrained_decoding,
                })
              }
              label="Constrained Decoding"
            />
          </div>
        )}
      </div>
    </Collapsible>
  )
}
