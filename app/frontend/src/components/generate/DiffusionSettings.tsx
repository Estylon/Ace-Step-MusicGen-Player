import { Dices } from 'lucide-react'
import Collapsible from '../ui/Collapsible'
import Slider from '../ui/Slider'
import Select from '../ui/Select'
import Input from '../ui/Input'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { useGenerationStore } from '../../stores/useGenerationStore'
import { useSettingsStore } from '../../stores/useSettingsStore'

export default function DiffusionSettings() {
  const form = useGenerationStore((s) => s.form)
  const updateForm = useGenerationStore((s) => s.updateForm)
  const modelStatus = useSettingsStore((s) => s.modelStatus)

  const currentModel = modelStatus?.current_model
  const isTurbo = currentModel?.type === 'turbo'
  const capabilities = currentModel?.capabilities
  const cfgSupport = capabilities?.cfg_support ?? false
  const maxSteps = capabilities?.max_steps ?? 100
  const adgSupport = capabilities?.adg_support ?? false
  const inferMethods = capabilities?.infer_methods ?? ['ode', 'sde']

  const methodOptions = inferMethods.map((m) => ({
    value: m,
    label: m.toUpperCase(),
  }))

  const randomizeSeed = () => {
    updateForm({ seed: Math.floor(Math.random() * 2147483647) })
  }

  return (
    <Collapsible title="Diffusion Settings" defaultOpen={false}>
      <div className="flex flex-col gap-4">
        {/* Steps */}
        {isTurbo ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">Steps</span>
            <Badge variant="accent">8</Badge>
            <span className="text-xs text-[var(--text-muted)]">
              Fixed for turbo model
            </span>
          </div>
        ) : (
          <Slider
            label="Inference Steps"
            min={8}
            max={maxSteps}
            step={1}
            value={[form.inference_steps]}
            onValueChange={([v]) => updateForm({ inference_steps: v })}
          />
        )}

        {/* Guidance Scale (not for turbo) */}
        {!isTurbo && (
          <Slider
            label="Guidance Scale"
            min={0}
            max={30}
            step={0.5}
            value={[form.guidance_scale]}
            onValueChange={([v]) => updateForm({ guidance_scale: v })}
            formatValue={(v) => v.toFixed(1)}
          />
        )}

        {/* ADG toggle (not for turbo, only if supported) */}
        {!isTurbo && adgSupport && (
          <label className="inline-flex items-center gap-2 cursor-pointer select-none w-fit">
            <button
              type="button"
              role="switch"
              aria-checked={form.use_adg}
              onClick={() => updateForm({ use_adg: !form.use_adg })}
              className={`
                relative inline-flex h-5 w-9 shrink-0 items-center rounded-full
                border-2 border-transparent transition-colors duration-[var(--transition)]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
                ${form.use_adg ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)]'}
              `}
            >
              <span
                className={`
                  pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm
                  transition-transform duration-[var(--transition)]
                  ${form.use_adg ? 'translate-x-4' : 'translate-x-0.5'}
                `}
              />
            </button>
            <span className="text-sm text-[var(--text-secondary)]">
              Adaptive Diffusion Guidance (ADG)
            </span>
          </label>
        )}

        {/* Seed */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="Seed"
              type="number"
              value={form.seed}
              onChange={(e) =>
                updateForm({ seed: parseInt(e.target.value, 10) || -1 })
              }
              placeholder="-1 for random"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={randomizeSeed}
            className="shrink-0"
          >
            <Dices className="w-4 h-4" />
          </Button>
        </div>

        {/* Shift */}
        <Slider
          label="Shift"
          min={0.1}
          max={10.0}
          step={0.1}
          value={[form.shift]}
          onValueChange={([v]) => updateForm({ shift: v })}
          formatValue={(v) => v.toFixed(1)}
        />

        {/* Method (only for base/sft) */}
        {!isTurbo && methodOptions.length > 1 && (
          <Select
            label="Method"
            options={methodOptions}
            value={form.infer_method}
            onValueChange={(v) =>
              updateForm({ infer_method: v as 'ode' | 'sde' })
            }
          />
        )}

        {/* CFG Interval (only when supported) */}
        {cfgSupport && (
          <div className="grid grid-cols-2 gap-4">
            <Slider
              label="CFG Interval Start"
              min={0}
              max={1}
              step={0.01}
              value={[form.cfg_interval_start]}
              onValueChange={([v]) =>
                updateForm({ cfg_interval_start: v })
              }
              formatValue={(v) => v.toFixed(2)}
            />
            <Slider
              label="CFG Interval End"
              min={0}
              max={1}
              step={0.01}
              value={[form.cfg_interval_end]}
              onValueChange={([v]) =>
                updateForm({ cfg_interval_end: v })
              }
              formatValue={(v) => v.toFixed(2)}
            />
          </div>
        )}
      </div>
    </Collapsible>
  )
}
