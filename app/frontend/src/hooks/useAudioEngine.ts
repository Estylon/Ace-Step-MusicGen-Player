/**
 * React hook that bridges the player Zustand store with the audio engine.
 *
 * Mount this **once** inside AppShell so it persists across route changes.
 * It listens to HTMLAudioElement events and pushes updates into the store,
 * and runs a requestAnimationFrame loop for smooth currentTime updates.
 */

import { useEffect, useRef } from 'react'
import { getAudioElement } from '../lib/audioEngine'
import { usePlayerStore } from '../stores/usePlayerStore'

export function useAudioEngine() {
  const mountedRef = useRef(false)

  useEffect(() => {
    // Guard against StrictMode double-mount
    if (mountedRef.current) return
    mountedRef.current = true

    const audio = getAudioElement()
    let rafId = 0

    // ── rAF loop: sync currentTime store → UI ─────────────────────────────
    const tick = () => {
      const { isPlaying } = usePlayerStore.getState()
      if (isPlaying && !audio.paused) {
        usePlayerStore.setState({ currentTime: audio.currentTime })
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    // ── Audio element event handlers ───────────────────────────────────────
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) {
        usePlayerStore.setState({ duration: audio.duration })
      }
    }

    const onEnded = () => {
      usePlayerStore.getState().next()
    }

    const onError = () => {
      console.error('[AudioEngine] Playback error:', audio.error)
      usePlayerStore.setState({ isPlaying: false })
    }

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      cancelAnimationFrame(rafId)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      mountedRef.current = false
    }
  }, [])
}
