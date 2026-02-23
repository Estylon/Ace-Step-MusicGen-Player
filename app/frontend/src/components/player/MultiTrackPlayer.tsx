import { useState, useRef, useCallback, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'
import clsx from 'clsx'
import WaveformPlayer from './WaveformPlayer'
import Slider from '../ui/Slider'
import { useStemStore } from '../../stores/useStemStore'
import { formatDuration } from '../../lib/utils'

// ── Stem type labels ─────────────────────────────────────────────────────────

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

// ── Placeholder peaks for stems ──────────────────────────────────────────────

function generatePlaceholderPeaks(stemType: string, count: number): number[] {
  const seed = stemType.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return Array.from({ length: count }, (_, i) => {
    return 0.15 + ((seed * (i + 1) * 7) % 85) / 100
  })
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MultiTrackPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const animFrameRef = useRef<number | null>(null)

  const results = useStemStore((s) => s.results)
  const stemVolumes = useStemStore((s) => s.stemVolumes)
  const stemMuted = useStemStore((s) => s.stemMuted)
  const stemSolo = useStemStore((s) => s.stemSolo)
  const toggleMute = useStemStore((s) => s.toggleMute)
  const toggleSolo = useStemStore((s) => s.toggleSolo)
  const setStemVolume = useStemStore((s) => s.setStemVolume)

  // Create/cleanup audio elements
  useEffect(() => {
    const map = audioRefs.current
    for (const stem of results) {
      if (!map.has(stem.id)) {
        const audio = new Audio(stem.audio_url)
        audio.preload = 'metadata'
        audio.addEventListener('loadedmetadata', () => {
          if (audio.duration && audio.duration > duration) {
            setDuration(audio.duration)
          }
        })
        map.set(stem.id, audio)
      }
    }

    return () => {
      for (const [, audio] of map) {
        audio.pause()
        audio.src = ''
      }
      map.clear()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results])

  // Update volumes based on solo/mute/volume state
  useEffect(() => {
    for (const stem of results) {
      const audio = audioRefs.current.get(stem.id)
      if (!audio) continue

      const vol = stemVolumes[stem.stem_type] ?? 1
      const muted = stemMuted[stem.stem_type] ?? false
      const isSoloed = stemSolo === stem.stem_type
      const hasSolo = stemSolo !== null

      if (muted || (hasSolo && !isSoloed)) {
        audio.volume = 0
      } else {
        audio.volume = vol
      }
    }
  }, [results, stemVolumes, stemMuted, stemSolo])

  // Animation loop for time updates
  const tick = useCallback(() => {
    const firstAudio = audioRefs.current.values().next().value as HTMLAudioElement | undefined
    if (firstAudio) {
      setCurrentTime(firstAudio.currentTime)
      if (firstAudio.ended) {
        setIsPlaying(false)
      }
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }, [])

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      // Pause all
      for (const [, audio] of audioRefs.current) {
        audio.pause()
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      setIsPlaying(false)
    } else {
      // Play all synchronized
      for (const [, audio] of audioRefs.current) {
        audio.play()
      }
      animFrameRef.current = requestAnimationFrame(tick)
      setIsPlaying(true)
    }
  }, [isPlaying, tick])

  const handleSeek = useCallback(
    (ratio: number) => {
      const time = ratio * duration
      for (const [, audio] of audioRefs.current) {
        audio.currentTime = time
      }
      setCurrentTime(time)
    },
    [duration],
  )

  const progress = duration > 0 ? currentTime / duration : 0

  if (results.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {/* Master transport */}
      <div className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--bg-secondary)] border border-[var(--border)]">
        <button
          onClick={handlePlayPause}
          className={clsx(
            'flex items-center justify-center w-10 h-10 rounded-full shrink-0',
            'bg-[var(--accent)] text-white',
            'hover:bg-[var(--accent-hover)]',
            'transition-colors duration-[var(--transition)]',
          )}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </button>

        <span className="text-sm font-mono text-[var(--text-primary)] tabular-nums w-20 text-center">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>

        {/* Simple progress bar for master transport */}
        <div
          className="flex-1 h-1.5 rounded-full bg-[var(--bg-elevated)] cursor-pointer relative"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            handleSeek((e.clientX - rect.left) / rect.width)
          }}
        >
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Individual stem rows */}
      <div className="flex flex-col gap-1">
        {results.map((stem) => {
          const vol = stemVolumes[stem.stem_type] ?? 1
          const muted = stemMuted[stem.stem_type] ?? false
          const soloed = stemSolo === stem.stem_type
          const peaks = generatePlaceholderPeaks(stem.stem_type, 60)

          return (
            <div
              key={stem.id}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-[var(--radius)]',
                'hover:bg-[var(--bg-hover)]',
                'transition-colors duration-[var(--transition)]',
                muted && 'opacity-40',
              )}
            >
              {/* Label */}
              <span className="text-xs font-medium text-[var(--text-secondary)] w-24 shrink-0 truncate">
                {stemLabel(stem.stem_type)}
              </span>

              {/* Waveform */}
              <div className="flex-1 h-10">
                <WaveformPlayer
                  peaks={peaks}
                  progress={progress}
                  onSeek={handleSeek}
                  className="h-full"
                />
              </div>

              {/* Solo */}
              <button
                onClick={() => toggleSolo(stem.stem_type)}
                className={clsx(
                  'flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold',
                  'transition-colors duration-[var(--transition)]',
                  soloed
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                )}
                title="Solo"
              >
                S
              </button>

              {/* Mute */}
              <button
                onClick={() => toggleMute(stem.stem_type)}
                className={clsx(
                  'flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold',
                  'transition-colors duration-[var(--transition)]',
                  muted
                    ? 'bg-[var(--error-muted)] text-[var(--error)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                )}
                title="Mute"
              >
                M
              </button>

              {/* Volume */}
              <div className="w-16 shrink-0">
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[vol]}
                  onValueChange={(v) => setStemVolume(stem.stem_type, v[0])}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
