import { useCallback } from 'react'
import {
  Mic,
  Drum,
  Guitar,
  Piano,
  Music,
  Download,
  Play,
} from 'lucide-react'
import clsx from 'clsx'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Slider from '../ui/Slider'
import { useStemStore } from '../../stores/useStemStore'
import type { StemInfo } from '../../types'

// ── Stem type icons & labels ─────────────────────────────────────────────────

const STEM_ICONS: Record<string, typeof Mic> = {
  vocals: Mic,
  drums: Drum,
  bass: Guitar,
  other: Piano,
  instrumental: Music,
}

function getStemIcon(stemType: string) {
  return STEM_ICONS[stemType.toLowerCase()] ?? Music
}

function stemLabel(stemType: string): string {
  const labels: Record<string, string> = {
    vocals: 'Vocals',
    drums: 'Drums',
    bass: 'Bass',
    other: 'Other',
    instrumental: 'Instrumental',
  }
  return labels[stemType.toLowerCase()] ?? stemType
}

// ── Fake waveform bar (CSS gradient bars) ────────────────────────────────────

function WaveformBar({ stemType }: { stemType: string }) {
  // Deterministic pseudo-random heights based on stem type
  const seed = stemType.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const bars = Array.from({ length: 32 }, (_, i) => {
    const h = 20 + ((seed * (i + 1) * 7) % 80)
    return h
  })

  return (
    <div className="flex items-end gap-px h-8 flex-1">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-[var(--waveform-wave)] min-w-[2px]"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  )
}

// ── Stem row ─────────────────────────────────────────────────────────────────

interface StemRowProps {
  stem: StemInfo
  volume: number
  muted: boolean
  soloed: boolean
  onToggleMute: () => void
  onToggleSolo: () => void
  onVolumeChange: (v: number) => void
}

function StemRow({
  stem,
  volume,
  muted,
  soloed,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
}: StemRowProps) {
  const Icon = getStemIcon(stem.stem_type)

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = stem.audio_url
    a.download = `${stem.stem_type}.wav`
    a.click()
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)]',
        'transition-colors duration-[var(--transition)]',
        'hover:bg-[var(--bg-hover)]',
        muted && 'opacity-40',
      )}
    >
      {/* Icon + label */}
      <div className="flex items-center gap-2 w-28 shrink-0">
        <Icon className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
        <span className="text-sm font-medium text-[var(--text-primary)] truncate">
          {stemLabel(stem.stem_type)}
        </span>
      </div>

      {/* Waveform */}
      <WaveformBar stemType={stem.stem_type} />

      {/* Solo button */}
      <button
        onClick={onToggleSolo}
        className={clsx(
          'flex items-center justify-center w-7 h-7 rounded text-xs font-bold',
          'transition-colors duration-[var(--transition)]',
          soloed
            ? 'bg-[var(--accent)] text-white'
            : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
        )}
        title="Solo"
      >
        S
      </button>

      {/* Mute button */}
      <button
        onClick={onToggleMute}
        className={clsx(
          'flex items-center justify-center w-7 h-7 rounded text-xs font-bold',
          'transition-colors duration-[var(--transition)]',
          muted
            ? 'bg-[var(--error-muted)] text-[var(--error)]'
            : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
        )}
        title="Mute"
      >
        M
      </button>

      {/* Volume slider */}
      <div className="w-20 shrink-0">
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[volume]}
          onValueChange={(v) => onVolumeChange(v[0])}
        />
      </div>

      {/* Download */}
      <button
        onClick={handleDownload}
        className={clsx(
          'p-1.5 rounded text-[var(--text-muted)]',
          'hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
          'transition-colors duration-[var(--transition)]',
        )}
        title="Download stem"
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function StemResults() {
  const results = useStemStore((s) => s.results)
  const stemVolumes = useStemStore((s) => s.stemVolumes)
  const stemMuted = useStemStore((s) => s.stemMuted)
  const stemSolo = useStemStore((s) => s.stemSolo)
  const toggleMute = useStemStore((s) => s.toggleMute)
  const toggleSolo = useStemStore((s) => s.toggleSolo)
  const setStemVolume = useStemStore((s) => s.setStemVolume)

  const handleDownloadAll = useCallback(() => {
    for (const stem of results) {
      const a = document.createElement('a')
      a.href = stem.audio_url
      a.download = `${stem.stem_type}.wav`
      a.click()
    }
  }, [results])

  if (results.length === 0) {
    return null
  }

  return (
    <Card>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            Separated Stems
          </span>
          <div className="flex items-center gap-1.5">
            {stemSolo !== null && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-muted)] text-[var(--accent)]">
                Solo: {stemLabel(stemSolo)}
              </span>
            )}
          </div>
        </div>

        {/* Stem rows */}
        <div className="flex flex-col">
          {results.map((stem) => {
            const vol = stemVolumes[stem.stem_type] ?? 1
            const muted = stemMuted[stem.stem_type] ?? false
            const soloed = stemSolo === stem.stem_type

            return (
              <StemRow
                key={stem.id}
                stem={stem}
                volume={vol}
                muted={muted}
                soloed={soloed}
                onToggleMute={() => toggleMute(stem.stem_type)}
                onToggleSolo={() => toggleSolo(stem.stem_type)}
                onVolumeChange={(v) => setStemVolume(stem.stem_type, v)}
              />
            )
          })}
        </div>

        {/* Bottom actions */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border)]">
          <Button size="sm" variant="primary">
            <Play className="h-3.5 w-3.5" />
            Play All
          </Button>
          <Button size="sm" variant="secondary" onClick={handleDownloadAll}>
            <Download className="h-3.5 w-3.5" />
            Download All
          </Button>
        </div>
      </div>
    </Card>
  )
}
