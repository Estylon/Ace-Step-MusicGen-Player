import { Play, Scissors, Download, Music } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { useGenerationStore } from '../../stores/useGenerationStore'
import { usePlayerStore } from '../../stores/usePlayerStore'
import { formatDuration } from '../../lib/utils'
import type { TrackInfo } from '../../types'

function MiniWaveform({ peaks }: { peaks: number[] | null }) {
  if (!peaks || peaks.length === 0) {
    // Fallback: generate placeholder bars
    const bars = Array.from({ length: 32 }, () => 0.2 + Math.random() * 0.6)
    return <WaveformBars bars={bars} />
  }

  // Normalize peaks to 0-1 range
  const max = Math.max(...peaks, 0.01)
  const normalized = peaks.map((p) => Math.max(0.05, p / max))

  // Downsample to ~32 bars
  const targetBars = 32
  const step = Math.max(1, Math.floor(normalized.length / targetBars))
  const bars: number[] = []
  for (let i = 0; i < normalized.length && bars.length < targetBars; i += step) {
    const slice = normalized.slice(i, i + step)
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length
    bars.push(avg)
  }

  return <WaveformBars bars={bars} />
}

function WaveformBars({ bars }: { bars: number[] }) {
  return (
    <div className="flex items-end gap-[1px] h-8 w-full">
      {bars.map((height, i) => (
        <div
          key={i}
          className="flex-1 rounded-[1px] bg-[var(--accent)] opacity-60"
          style={{ height: `${Math.max(8, height * 100)}%` }}
        />
      ))}
    </div>
  )
}

function ResultCard({ track }: { track: TrackInfo }) {
  const play = usePlayerStore((s) => s.play)
  const navigate = useNavigate()

  const truncatedCaption =
    track.caption.length > 60
      ? track.caption.slice(0, 57) + '...'
      : track.caption

  return (
    <Card hover className="flex flex-col gap-3">
      {/* Waveform */}
      <MiniWaveform peaks={track.peaks} />

      {/* Track info */}
      <div className="flex flex-col gap-1 min-w-0">
        <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">
          {track.title || truncatedCaption || 'Untitled'}
        </h4>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge>{formatDuration(track.duration)}</Badge>
          <Badge>seed: {track.seed}</Badge>
          <Badge variant="accent">{track.model_name}</Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => play(track)}
          className="flex-1"
        >
          <Play className="w-3.5 h-3.5" />
          Play
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            navigate('/stems', { state: { trackId: track.id, audioUrl: track.audio_url } })
          }
        >
          <Scissors className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const a = document.createElement('a')
            a.href = track.audio_url
            a.download = `${track.title || 'track'}.${track.audio_format}`
            a.click()
          }}
        >
          <Download className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  )
}

export default function GenerationResults() {
  const results = useGenerationStore((s) => s.results)

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)]">
          <Music className="w-7 h-7 text-[var(--text-muted)]" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            No tracks yet
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Generate your first track to see results here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">
          Results ({results.length})
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {results.map((track) => (
          <ResultCard key={track.id} track={track} />
        ))}
      </div>
    </div>
  )
}
