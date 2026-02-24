/**
 * Module-level audio engine singleton.
 *
 * Manages a single HTMLAudioElement plus a Web Audio API AnalyserNode
 * for real-time frequency visualization.  This module has zero React or
 * store dependencies — it's a pure imperative layer that the Zustand
 * store and React hooks call into.
 */

let audio: HTMLAudioElement | null = null
let audioCtx: AudioContext | null = null
let analyserNode: AnalyserNode | null = null
let sourceNode: MediaElementAudioSourceNode | null = null
let _contextInitialized = false

// ── Element access ───────────────────────────────────────────────────────────

/** Lazily create & return the singleton Audio element. */
export function getAudioElement(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio()
    audio.preload = 'auto'
  }
  return audio
}

/** Return the AnalyserNode (or null if not yet initialised). */
export function getAnalyserNode(): AnalyserNode | null {
  return analyserNode
}

// ── Web Audio API setup ──────────────────────────────────────────────────────

/**
 * Initialise the AudioContext + AnalyserNode.
 * Must be called from a user-gesture handler (click / keydown) the
 * first time, otherwise the browser will block it.
 */
export function ensureAudioContext(): boolean {
  if (_contextInitialized) return true
  try {
    const el = getAudioElement()
    audioCtx = new AudioContext()
    analyserNode = audioCtx.createAnalyser()
    analyserNode.fftSize = 128           // 64 frequency bins
    analyserNode.smoothingTimeConstant = 0.82

    sourceNode = audioCtx.createMediaElementSource(el)
    sourceNode.connect(analyserNode)
    analyserNode.connect(audioCtx.destination)

    _contextInitialized = true
    return true
  } catch (err) {
    console.warn('[AudioEngine] Web Audio API init failed:', err)
    return false
  }
}

// ── Playback control ─────────────────────────────────────────────────────────

/** Load a new track URL and reset position. */
export function loadTrack(url: string) {
  const el = getAudioElement()
  el.src = url
  el.currentTime = 0
  el.load()
}

/** Start / resume playback. Ensures AudioContext is running. */
export async function playAudio() {
  ensureAudioContext()
  // Resume a suspended AudioContext (required after first user gesture)
  if (audioCtx?.state === 'suspended') {
    await audioCtx.resume()
  }
  const el = getAudioElement()
  try {
    await el.play()
  } catch (err) {
    console.warn('[AudioEngine] play() rejected:', err)
  }
}

/** Pause playback. */
export function pauseAudio() {
  getAudioElement().pause()
}

/** Seek to a specific time in seconds. */
export function seekAudio(time: number) {
  const el = getAudioElement()
  if (Number.isFinite(time)) {
    el.currentTime = time
  }
}

/** Set volume (0 – 1). */
export function setAudioVolume(v: number) {
  getAudioElement().volume = Math.max(0, Math.min(1, v))
}

// ── Frequency data (for visualiser) ──────────────────────────────────────────

const EMPTY = new Uint8Array(0)

/** Return the current frequency data (0-255 per bin). */
export function getFrequencyData(): Uint8Array {
  if (!analyserNode) return EMPTY
  const buf = new Uint8Array(analyserNode.frequencyBinCount)
  analyserNode.getByteFrequencyData(buf)
  return buf
}

// ── Cleanup ──────────────────────────────────────────────────────────────────

export function dispose() {
  if (audio) {
    audio.pause()
    audio.src = ''
  }
  if (audioCtx) {
    audioCtx.close().catch(() => {})
    audioCtx = null
  }
  analyserNode = null
  sourceNode = null
  _contextInitialized = false
}
