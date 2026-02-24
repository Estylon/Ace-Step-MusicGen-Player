/**
 * Real-time audio frequency visualizer using canvas.
 *
 * Reads byte-frequency data from the Web Audio API AnalyserNode
 * (via audioEngine) and renders animated vertical bars with a
 * gradient from the accent colour to a lighter shade.
 */

import { useEffect, useRef } from 'react'
import { getFrequencyData } from '../../lib/audioEngine'
import { usePlayerStore } from '../../stores/usePlayerStore'

interface AudioVisualizerProps {
  width?: number
  height?: number
  barCount?: number
  className?: string
}

export default function AudioVisualizer({
  width = 120,
  height = 40,
  barCount = 24,
  className,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // High-DPI support
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const barWidth = (width - (barCount - 1)) / barCount
    const gap = 1

    // Smooth values for idle animation
    const smoothBars = new Float32Array(barCount).fill(0)

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      const freq = getFrequencyData()
      const hasData = freq.length > 0

      for (let i = 0; i < barCount; i++) {
        let target: number

        if (hasData && isPlaying) {
          // Map bar index to frequency bin
          const binIndex = Math.floor((i / barCount) * freq.length)
          target = (freq[binIndex] / 255) * height
        } else if (isPlaying) {
          // No analyser data but playing — subtle idle bounce
          target = (Math.sin(Date.now() / 300 + i * 0.5) * 0.3 + 0.35) * height
        } else {
          // Paused — static small bars
          target = 3
        }

        // Smooth interpolation
        smoothBars[i] += (target - smoothBars[i]) * 0.18
        const barHeight = Math.max(2, smoothBars[i])

        const x = i * (barWidth + gap)
        const y = height - barHeight

        // Gradient per bar
        const grad = ctx.createLinearGradient(x, height, x, y)
        grad.addColorStop(0, 'rgba(124, 58, 237, 0.9)')   // --accent
        grad.addColorStop(1, 'rgba(167, 139, 250, 0.7)')   // lighter accent

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, 1)
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => cancelAnimationFrame(rafRef.current)
  }, [width, height, barCount, isPlaying])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height }}
    />
  )
}
