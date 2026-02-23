import { useCallback } from 'react'
import Textarea from '../ui/Textarea'
import { useGenerationStore } from '../../stores/useGenerationStore'

export default function PromptEditor() {
  const caption = useGenerationStore((s) => s.form.caption)
  const lyrics = useGenerationStore((s) => s.form.lyrics)
  const instrumental = useGenerationStore((s) => s.form.instrumental)
  const updateForm = useGenerationStore((s) => s.updateForm)

  const handleInstrumentalToggle = useCallback(() => {
    const nextInstrumental = !instrumental
    updateForm({
      instrumental: nextInstrumental,
      lyrics: nextInstrumental ? '[Instrumental]' : '',
    })
  }, [instrumental, updateForm])

  return (
    <div className="flex flex-col gap-4">
      {/* Caption */}
      <Textarea
        label="Music Description"
        placeholder="A dreamy lo-fi beat with soft piano and warm vinyl crackle..."
        maxLength={512}
        value={caption}
        onChange={(e) => updateForm({ caption: e.target.value })}
        autoResize
        className="min-h-[80px]"
      />

      {/* Instrumental toggle */}
      <label className="inline-flex items-center gap-2 cursor-pointer select-none w-fit">
        <button
          type="button"
          role="switch"
          aria-checked={instrumental}
          onClick={handleInstrumentalToggle}
          className={`
            relative inline-flex h-5 w-9 shrink-0 items-center rounded-full
            border-2 border-transparent transition-colors duration-[var(--transition)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
            ${instrumental ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)]'}
          `}
        >
          <span
            className={`
              pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm
              transition-transform duration-[var(--transition)]
              ${instrumental ? 'translate-x-4' : 'translate-x-0.5'}
            `}
          />
        </button>
        <span className="text-sm text-[var(--text-secondary)]">
          Instrumental
        </span>
      </label>

      {/* Lyrics */}
      <Textarea
        label="Lyrics"
        placeholder={
          'Write lyrics with section tags like [Verse], [Chorus]...\nOr type [Instrumental] for no vocals'
        }
        maxLength={4096}
        value={lyrics}
        onChange={(e) => updateForm({ lyrics: e.target.value })}
        disabled={instrumental}
        autoResize
        className="min-h-[120px]"
      />
    </div>
  )
}
