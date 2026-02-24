import { create } from 'zustand'
import type { TrackInfo } from '../types'
import {
  loadTrack,
  playAudio,
  pauseAudio,
  seekAudio,
  setAudioVolume,
} from '../lib/audioEngine'

type RepeatMode = 'none' | 'all' | 'one'

interface PlayerState {
  currentTrack: TrackInfo | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  queue: TrackInfo[]
  queueIndex: number
  repeatMode: RepeatMode
  shuffle: boolean
  fullPlayerOpen: boolean

  play: (track: TrackInfo) => void
  pause: () => void
  resume: () => void
  seek: (time: number) => void
  setVolume: (v: number) => void
  next: () => void
  prev: () => void
  addToQueue: (track: TrackInfo) => void
  toggleRepeat: () => void
  toggleShuffle: () => void
  openFullPlayer: () => void
  closeFullPlayer: () => void
  toggleFullPlayer: () => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  setQueue: (tracks: TrackInfo[]) => void
  moveInQueue: (from: number, to: number) => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  queue: [],
  queueIndex: -1,
  repeatMode: 'none',
  shuffle: false,
  fullPlayerOpen: false,

  play: (track) => {
    const { queue, volume } = get()

    // Load + play via audio engine
    loadTrack(track.audio_url)
    setAudioVolume(volume)
    playAudio()

    const existingIndex = queue.findIndex((t) => t.id === track.id)
    if (existingIndex >= 0) {
      set({
        currentTrack: track,
        isPlaying: true,
        currentTime: 0,
        duration: track.duration,
        queueIndex: existingIndex,
      })
    } else {
      const newQueue = [...queue, track]
      set({
        currentTrack: track,
        isPlaying: true,
        currentTime: 0,
        duration: track.duration,
        queue: newQueue,
        queueIndex: newQueue.length - 1,
      })
    }
  },

  pause: () => {
    pauseAudio()
    set({ isPlaying: false })
  },

  resume: () => {
    const { volume } = get()
    setAudioVolume(volume)
    playAudio()
    set({ isPlaying: true })
  },

  seek: (time) => {
    seekAudio(time)
    set({ currentTime: time })
  },

  setVolume: (v) => {
    const clamped = Math.max(0, Math.min(1, v))
    setAudioVolume(clamped)
    set({ volume: clamped })
  },

  next: () => {
    const { queue, queueIndex, repeatMode, shuffle, volume } = get()
    if (queue.length === 0) return

    if (repeatMode === 'one') {
      // Replay current track from the start
      seekAudio(0)
      playAudio()
      set({ currentTime: 0, isPlaying: true })
      return
    }

    let nextIndex: number

    if (shuffle) {
      if (queue.length === 1) {
        nextIndex = 0
      } else {
        do {
          nextIndex = Math.floor(Math.random() * queue.length)
        } while (nextIndex === queueIndex)
      }
    } else {
      nextIndex = queueIndex + 1
    }

    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0
      } else {
        pauseAudio()
        set({ isPlaying: false })
        return
      }
    }

    const nextTrack = queue[nextIndex]
    loadTrack(nextTrack.audio_url)
    setAudioVolume(volume)
    playAudio()
    set({
      currentTrack: nextTrack,
      isPlaying: true,
      currentTime: 0,
      duration: nextTrack.duration,
      queueIndex: nextIndex,
    })
  },

  prev: () => {
    const { queue, queueIndex, currentTime, repeatMode, shuffle, volume } = get()
    if (queue.length === 0) return

    // If more than 3 seconds in, restart current track
    if (currentTime > 3) {
      seekAudio(0)
      set({ currentTime: 0 })
      return
    }

    let prevIndex: number

    if (shuffle) {
      if (queue.length === 1) {
        prevIndex = 0
      } else {
        do {
          prevIndex = Math.floor(Math.random() * queue.length)
        } while (prevIndex === queueIndex)
      }
    } else {
      prevIndex = queueIndex - 1
    }

    if (prevIndex < 0) {
      if (repeatMode === 'all') {
        prevIndex = queue.length - 1
      } else {
        seekAudio(0)
        set({ currentTime: 0 })
        return
      }
    }

    const prevTrack = queue[prevIndex]
    loadTrack(prevTrack.audio_url)
    setAudioVolume(volume)
    playAudio()
    set({
      currentTrack: prevTrack,
      isPlaying: true,
      currentTime: 0,
      duration: prevTrack.duration,
      queueIndex: prevIndex,
    })
  },

  addToQueue: (track) => {
    set((state) => ({
      queue: [...state.queue, track],
    }))
  },

  toggleRepeat: () => {
    set((state) => {
      const modes: RepeatMode[] = ['none', 'all', 'one']
      const currentIdx = modes.indexOf(state.repeatMode)
      const nextMode = modes[(currentIdx + 1) % modes.length]
      return { repeatMode: nextMode }
    })
  },

  toggleShuffle: () => {
    set((state) => ({ shuffle: !state.shuffle }))
  },

  openFullPlayer: () => {
    set({ fullPlayerOpen: true })
  },

  closeFullPlayer: () => {
    set({ fullPlayerOpen: false })
  },

  toggleFullPlayer: () => {
    set((state) => ({ fullPlayerOpen: !state.fullPlayerOpen }))
  },

  removeFromQueue: (index) => {
    const { queue, queueIndex } = get()
    if (index < 0 || index >= queue.length) return

    const newQueue = queue.filter((_, i) => i !== index)
    let newIndex = queueIndex

    if (newQueue.length === 0) {
      newIndex = -1
    } else if (index < queueIndex) {
      newIndex = queueIndex - 1
    } else if (index === queueIndex) {
      // Currently playing track was removed
      newIndex = Math.min(queueIndex, newQueue.length - 1)
    }

    set({ queue: newQueue, queueIndex: newIndex })
  },

  clearQueue: () => {
    set({ queue: [], queueIndex: -1 })
  },

  setQueue: (tracks) => {
    if (tracks.length === 0) {
      set({ queue: [], queueIndex: -1 })
      return
    }

    const { volume } = get()
    const firstTrack = tracks[0]
    loadTrack(firstTrack.audio_url)
    setAudioVolume(volume)
    playAudio()

    set({
      queue: tracks,
      queueIndex: 0,
      currentTrack: firstTrack,
      isPlaying: true,
      currentTime: 0,
      duration: firstTrack.duration,
    })
  },

  moveInQueue: (from, to) => {
    set((state) => {
      const { queue, queueIndex } = state
      if (
        from < 0 || from >= queue.length ||
        to < 0 || to >= queue.length ||
        from === to
      ) {
        return state
      }

      const newQueue = [...queue]
      const [moved] = newQueue.splice(from, 1)
      newQueue.splice(to, 0, moved)

      // Adjust queueIndex to follow the currently playing track
      let newIndex = queueIndex
      if (queueIndex === from) {
        newIndex = to
      } else if (from < queueIndex && to >= queueIndex) {
        newIndex = queueIndex - 1
      } else if (from > queueIndex && to <= queueIndex) {
        newIndex = queueIndex + 1
      }

      return { queue: newQueue, queueIndex: newIndex }
    })
  },
}))
