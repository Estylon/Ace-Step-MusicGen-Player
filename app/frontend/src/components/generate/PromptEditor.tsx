import { useCallback } from 'react'
import { Tag } from 'lucide-react'
import Textarea from '../ui/Textarea'
import Badge from '../ui/Badge'
import { useGenerationStore } from '../../stores/useGenerationStore'
import { useSettingsStore } from '../../stores/useSettingsStore'

export default function PromptEditor() {
  const caption = useGenerationStore((s) => s.form.caption)
  const lyrics = useGenerationStore((s) => s.form.lyrics)
  const instrumental = useGenerationStore((s) => s.form.instrumental)
  const trackName = useGenerationStore((s) => s.form.track_name)
  const updateForm = useGenerationStore((s) => s.updateForm)

  const adapterName = useSettingsStore(
    (s) => (s.adapterList?.current?.loaded && s.adapterList.current.active)
      ? s.adapterList.current.name
      : null,
  )
  const activeStyleTag = useSettingsStore((s) => s.getActiveStyleTag())

  const handleInstrumentalToggle = useCallback(() => {
    const nextInstrumental = !instrumental
    updateForm({
      instrumental: nextInstrumental,
      lyrics: nextInstrumental ? '[Instrumental]' : '',
    })
  }, [instrumental, updateForm])

  return (
    <div className="flex flex-col gap-4">
      {/* Track Name */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="track-name"
          className="text-sm font-medium text-[var(--text-secondary)]"
        >
          Track Name
        </label>
        <input
          id="track-name"
          type="text"
          placeholder="Give your track a name..."
          maxLength={100}
          value={trackName || ''}
          onChange={(e) => updateForm({ track_name: e.target.value || null })}
          className="
            w-full rounded-[var(--radius)] px-3 py-2 text-sm
            bg-[var(--bg-secondary)] text-[var(--text-primary)]
            border border-[var(--border)]
            placeholder:text-[var(--text-muted)]
            transition-colors duration-[var(--transition)]
            hover:border-[var(--border-hover)]
            focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]
          "
        />
      </div>

      {/* Caption */}
      <div className="flex flex-col gap-1.5">
        <Textarea
          label="Music Description"
          placeholder="A dreamy lo-fi beat with soft piano and warm vinyl crackle..."
          maxLength={512}
          value={caption}
          onChange={(e) => updateForm({ caption: e.target.value })}
          autoResize
          className="min-h-[80px]"
        />
        {activeStyleTag && (
          <div className="flex items-center gap-1.5 px-1">
            <Tag className="w-3 h-3 text-[var(--accent)]" />
            <span className="text-[11px] text-[var(--text-muted)]">
              <span className="font-medium text-[var(--accent-hover)]">{activeStyleTag}</span>
              {' '}will be prepended
            </span>
            {adapterName && (
              <Badge variant="accent" className="ml-auto text-[10px]">
                {adapterName}
              </Badge>
            )}
          </div>
        )}
      </div>

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
